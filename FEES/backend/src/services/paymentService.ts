import prisma from '../config/database';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import {
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import logger from '../config/logger';

let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new ValidationError(
        'Razorpay credentials not configured'
      );
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

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
  async createRazorpayOrder(
    amount: number,
    currency: string = 'INR',
    receipt?: string
  ) {
    try {
      const razorpay = getRazorpayInstance();

      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1,
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
      };
      } catch (error: any) {
        console.error('========== RAZORPAY ORDER ERROR ==========');
        console.error('Full error:', error);
        console.error('Error message:', error?.message);
        console.error('Error description:', error?.error?.description);
        console.error('Error code:', error?.error?.code);
        console.error('Error status:', error?.statusCode);
        console.error('Error response:', error?.response?.data);
        console.error('==========================================');

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
  }) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = data;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new ValidationError(
        'Razorpay credentials not configured'
      );
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
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

    return {
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    };
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
    const invoice = await prisma.invoice.findFirst({
      where: { id: BigInt(invoiceId), school_id: BigInt(schoolId) },
      include: {
        student: {
          select: {
            id: true,
            admission_number: true,
            first_name: true,
            last_name: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (data.amount <= 0) {
      throw new ValidationError(
        'Payment amount must be greater than 0'
      );
    }

    const totalAmount = Number(invoice.total_amount);

    const alreadyPaid = invoice.payment.reduce(
      (sum, payment) => {
        if (
          payment.status &&
          payment.status.toLowerCase() === 'cancelled'
        ) {
          return sum;
        }

        return sum + Number(payment.amount);
      },
      0
    );

    const remainingAmount = Math.max(
      0,
      totalAmount - alreadyPaid
    );

    if (remainingAmount <= 0) {
      throw new ValidationError(
        'This invoice is already fully paid'
      );
    }

    if (data.amount > remainingAmount) {
      throw new ValidationError(
        `Payment amount cannot exceed pending amount of ${remainingAmount}`
      );
    }

    const newAmountPaid =
      alreadyPaid + data.amount;

    const newAmountPending = Math.max(
      0,
      totalAmount - newAmountPaid
    );

    const newStatus = calculatePaymentStatus(
      newAmountPaid,
      totalAmount
    );

    /*
     * IMPORTANT:
     * The current schema requires school_id and payment_number.
     * We therefore obtain school_id from the invoice.
     */

    const payment = await prisma.$transaction(
      async (tx) => {
        const createdPayment =
          await tx.payment.create({
            data: {
              school_id: invoice.school_id,
              student_id: invoice.student_id,
              invoice_id: invoice.id,
              payment_number:
                generatePaymentNumber(),
              amount: data.amount,
              payment_date: new Date(),
              payment_method:
                normalizePaymentMethod(
                  data.paymentMethod
                ),
              transaction_id:
                data.transactionId ||
                data.razorpayPaymentId ||
                undefined,
              bank_name: data.bankName,
              cheque_number: data.chequeNumber,
              status: newStatus,
              remarks: data.notes,
              received_by: data.receivedBy,
            },
          });

        const updatedInvoice =
          await tx.invoice.update({
            where: {
              id: invoice.id,
            },
            data: {
              paid_amount: newAmountPaid,
              pending_amount: newAmountPending,
              status: newStatus,
            },
            include: {
              student: {
                select: {
                  id: true,
                  admission_number: true,
                  first_name: true,
                  last_name: true,
                },
              },
              payment: {
                select: {
                  id: true,
                  amount: true,
                  payment_method: true,
                  transaction_id: true,
                  payment_date: true,
                  status: true,
                  remarks: true,
                },
                orderBy: {
                  payment_date: 'desc',
                },
              },
            },
          });

        return {
          payment: createdPayment,
          invoice: updatedInvoice,
        };
      }
    );

    logger.info('Payment recorded', {
      invoiceId,
      paymentId: payment.payment.id.toString(),
      amount: data.amount,
      newStatus,
    });

    return payment;
  }

  async getPaymentHistory(invoiceId: string, schoolId: string) {
    const invoice =
      await prisma.invoice.findFirst({
        where: { id: BigInt(invoiceId), school_id: BigInt(schoolId) },
        include: {
          payment: {
            select: {
              id: true,
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
