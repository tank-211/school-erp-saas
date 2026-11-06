import prisma from '../config/database';
import { getSchoolRazorpay } from './schoolRazorpay';
import crypto from 'crypto';
import {
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import logger from '../config/logger';
import { recordPaymentAtomically } from './paymentLedger';

// Online payments use each school's own Razorpay account (services/schoolRazorpay).
// In-process guard: the browser confirmation and the webhook for the same
// payment must not both record it (a unique index in the database backs this up).
const recording = new Map<string, Promise<any>>();

function normalizePaymentMethod(method: string): string {
  return method.trim().toLowerCase();
}

function calculatePaymentStatus(
  paidAmount: number,
  totalAmount: number
): string {
  if (paidAmount >= totalAmount) {
    return 'paid';
  }

  if (paidAmount > 0) {
    return 'partial';
  }

  return 'unpaid';
}

function generatePaymentNumber(): string {
  return `PAY-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )
    .toString()
    .padStart(4, '0')}`;
}

export class PaymentService {
  /**
   * Create a Razorpay order for one invoice of the caller's school. The
   * invoice and school are stored on the order (notes), so verification can
   * record the payment against the right invoice using Razorpay's own amount.
   */
  async createRazorpayOrder(
    amount: number,
    currency: string = 'INR',
    invoiceId: string | undefined,
    schoolId: string
  ) {
    if (!/^\d+$/.test(String(invoiceId ?? ''))) {
      throw new ValidationError('A valid invoice is required to pay online');
    }
    const invoice = await prisma.invoice.findFirst({
      where: { id: BigInt(String(invoiceId)), school_id: BigInt(schoolId) },
      select: { id: true, pending_amount: true },
    });
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }
    const amountPaise = Math.round(Number(amount) * 100);
    const pendingPaise = Math.round(Number(invoice.pending_amount) * 100);
    if (!(amountPaise > 0)) {
      throw new ValidationError('Valid amount is required');
    }
    if (amountPaise > pendingPaise) {
      throw new ValidationError(`Amount cannot exceed the pending amount of ${(pendingPaise / 100).toFixed(2)}`);
    }

    // Throws "not set up" (409) when the school has no connected Razorpay account
    const rzp = await getSchoolRazorpay(schoolId);

    try {
      const razorpay = rzp.client;

      const options = {
        amount: amountPaise,
        currency,
        receipt: `inv_${invoice.id}_${Date.now()}`.slice(0, 40),
        payment_capture: 1,
        notes: {
          invoice_id: invoice.id.toString(),
          school_id: String(schoolId),
        },
      };

      const order = await razorpay.orders.create(options);

      logger.info('Razorpay order created', {
        orderId: order.id,
        amount: options.amount,
        currency,
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        // The school's public key: Checkout must open with the same account
        keyId: rzp.keyId,
        mode: rzp.mode,
      };
      } catch (error: any) {
        logger.error('Error creating Razorpay order', {
          message: error?.message,
          description: error?.error?.description,
          code: error?.error?.code,
          statusCode: error?.statusCode,
          response: error?.response?.data,
        });

        const razorpayMessage =
          error?.error?.description ||
          error?.response?.data?.error?.description ||
          error?.message ||
          'Unknown Razorpay error';

        throw new ValidationError(
          `Failed to create payment order: ${razorpayMessage}`
        );
      }
  }

  async verifyRazorpayPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }, schoolId?: string, receivedBy?: string) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = data;

    if (!schoolId) {
      throw new ValidationError('A school is required to verify a payment');
    }
    const rzp = await getSchoolRazorpay(schoolId);
    const keySecret = rzp.keySecret;

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest('hex');

    const expected = Buffer.from(generatedSignature);
    const given = Buffer.from(String(razorpay_signature));
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
      logger.warn(
        'Razorpay payment signature verification failed',
        {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
        }
      );

      throw new ValidationError(
        'Invalid payment signature'
      );
    }

    logger.info('Razorpay payment verified', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    // Record the payment. Invoice and amount come from the order as stored at
    // Razorpay, never from the browser.
    const order: any = await rzp.client.orders.fetch(razorpay_order_id);
    return this.recordFromOrder(order, razorpay_payment_id, schoolId, receivedBy || 'Razorpay');
  }

  /**
   * Records a captured Razorpay payment against the invoice named on its order,
   * once per payment id. Used by the browser confirmation and the webhook.
   */
  async recordFromOrder(order: any, razorpay_payment_id: string, schoolId: string, receivedBy: string) {
    const razorpay_order_id = String(order?.id || '');
    const orderInvoiceId = order?.notes?.invoice_id;
    if (!orderInvoiceId || String(order?.notes?.school_id) !== String(schoolId)) {
      throw new ValidationError('This payment does not belong to an invoice of your school');
    }

    const lockKey = `${schoolId}:${razorpay_payment_id}`;
    const inFlight = recording.get(lockKey);
    if (inFlight) {
      await inFlight.catch(() => undefined);
    }
    const work = this.recordOnce(order, razorpay_order_id, razorpay_payment_id, String(orderInvoiceId), schoolId, receivedBy);
    recording.set(lockKey, work);
    try {
      return await work;
    } finally {
      if (recording.get(lockKey) === work) recording.delete(lockKey);
    }
  }

  private async recordOnce(order: any, razorpay_order_id: string, razorpay_payment_id: string, orderInvoiceId: string, schoolId: string, receivedBy: string) {

    // The same payment verified twice (retry, double click) is recorded once
    const existing = await prisma.payment.findFirst({
      where: { school_id: BigInt(schoolId), transaction_id: razorpay_payment_id },
      select: { id: true, invoice_id: true, payment_number: true, amount: true },
    });
    if (existing) {
      if (existing.invoice_id !== BigInt(orderInvoiceId)) {
        throw new ValidationError('This Razorpay payment is already linked to a different invoice');
      }
      return {
        verified: true,
        recorded: true,
        alreadyRecorded: true,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        invoiceId: String(orderInvoiceId),
        paymentNumber: existing.payment_number,
        amount: Number(existing.amount),
      };
    }

    const amount = Number(order.amount) / 100;
    let result;
    try {
      result = await this.recordPayment(String(orderInvoiceId), schoolId, {
        amount,
        paymentMethod: 'online',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        notes: `Razorpay order ${razorpay_order_id}`,
        receivedBy: receivedBy || 'Razorpay',
      });
    } catch (error: any) {
      // Another server recorded it a moment earlier (unique index on the payment id)
      if (error?.code === 'P2002') {
        const again = await prisma.payment.findFirst({
          where: { school_id: BigInt(schoolId), transaction_id: razorpay_payment_id },
          select: { invoice_id: true, payment_number: true, amount: true },
        });
        if (!again) throw error;
        if (again.invoice_id !== BigInt(orderInvoiceId)) {
          throw new ValidationError('This Razorpay payment is already linked to a different invoice');
        }
        return {
          verified: true,
          recorded: true,
          alreadyRecorded: true,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          invoiceId: String(orderInvoiceId),
          paymentNumber: again?.payment_number,
          amount: Number(again?.amount ?? amount),
        };
      }
      throw error;
    }

    return {
      verified: true,
      recorded: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      invoiceId: String(orderInvoiceId),
      paymentNumber: result.payment.payment_number,
      amount,
      invoiceStatus: result.invoice.status,
    };
  }

  /**
   * Razorpay webhook for one school (POST /api/payments/razorpay/webhook/:schoolId).
   * Checks Razorpay's signature with the school's webhook secret, then records
   * the payment once, even if the parent closed the browser before returning.
   */
  async handleRazorpayWebhook(schoolId: string, rawBody: Buffer | undefined, signature: string | undefined) {
    if (!/^\d+$/.test(String(schoolId || ''))) {
      throw new ValidationError('Invalid school');
    }
    if (!rawBody || !signature) {
      throw new ValidationError('Missing webhook body or signature');
    }
    const rzp = await getSchoolRazorpay(schoolId);
    if (!rzp.webhookSecret) {
      throw new ValidationError('No webhook secret is saved for this school');
    }

    const expected = Buffer.from(crypto.createHmac('sha256', rzp.webhookSecret).update(rawBody).digest('hex'));
    const given = Buffer.from(String(signature));
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
      logger.warn('Razorpay webhook signature mismatch', { schoolId });
      throw new ValidationError('Invalid webhook signature');
    }

    let event: any;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new ValidationError('Webhook body is not JSON');
    }

    let order: any = null;
    let paymentId: string | null = null;
    if (event?.event === 'order.paid') {
      order = event.payload?.order?.entity || null;
      paymentId = event.payload?.payment?.entity?.id || null;
    } else if (event?.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      paymentId = payment?.id || null;
      if (payment?.order_id) order = await rzp.client.orders.fetch(payment.order_id);
    } else {
      return { ignored: true, reason: `event ${event?.event || 'unknown'} is not used` };
    }

    // Orders not created by this app for this school (no invoice note) are left alone
    if (!order || !paymentId || !order.notes?.invoice_id || String(order.notes?.school_id) !== String(schoolId)) {
      return { ignored: true, reason: 'not an invoice payment of this school' };
    }

    return this.recordFromOrder(order, paymentId, String(schoolId), 'Razorpay webhook');
  }

  async recordPayment(
    invoiceId: string,
    schoolId: string,
    data: {
      amount: number;
      paymentMethod: string;
      transactionId?: string;
      notes?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      bankName?: string;
      chequeNumber?: string;
      receivedBy?: string;
    }
  ) {
    const result = await recordPaymentAtomically(prisma, {
      invoiceId,
      schoolId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId || data.razorpayPaymentId,
      notes: data.notes,
      receivedBy: data.receivedBy,
      bankName: data.bankName,
      chequeNumber: data.chequeNumber,
      paymentNumber: generatePaymentNumber(),
    });

    logger.info('Payment recorded', {
      invoiceId,
      paymentId: result.payment.id.toString(),
      amount: data.amount,
      status: result.invoice.status,
    });
    return result;
  }

  async getPaymentHistory(invoiceId: string, schoolId: string) {
    const invoice =
      await prisma.invoice.findFirst({
        where: { id: BigInt(invoiceId), school_id: BigInt(schoolId) },
        include: {
          payment: {
            select: {
              id: true,
              payment_number: true,
              amount: true,
              payment_method: true,
              transaction_id: true,
              payment_date: true,
              status: true,
              remarks: true,
              cheque_number: true,
              bank_name: true,
            },
            orderBy: {
              payment_date: 'desc',
            },
          },
          student: {
            select: {
              id: true,
              admission_number: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    return {
      invoiceId: invoice.id.toString(),
      invoiceNumber: invoice.invoice_number,

      student: {
        id: invoice.student.id.toString(),
        admissionNumber:
          invoice.student.admission_number,
        firstName: invoice.student.first_name,
        lastName:
          invoice.student.last_name || '',
      },

      totalAmount: Number(invoice.total_amount),
      amountPaid: Number(
        invoice.paid_amount || 0
      ),
      amountPending: Number(
        invoice.pending_amount
      ),
      status: invoice.status,

      payments: invoice.payment.map(
        (payment) => ({
          id: payment.id.toString(),
          paymentNumber: payment.payment_number,
          amount: Number(payment.amount),
          paymentMethod:
            payment.payment_method,
          transactionId:
            payment.transaction_id,
          paymentDate:
            payment.payment_date,
          status: payment.status,
          remarks: payment.remarks,
          chequeNumber:
            payment.cheque_number,
          bankName: payment.bank_name,
        })
      ),
    };
  }
}

export default new PaymentService();
