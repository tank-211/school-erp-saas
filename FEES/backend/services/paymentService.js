import { razorpayInstance } from '../config/razorpay.js';
import logger from '../config/logger.js';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Payment Service
 *
 * Handles:
 * - Razorpay order creation
 * - Payment signature verification
 * - Payment status/details
 * - Refunds
 * - Transaction listing
 * - Transaction counting
 * - Webhook signature verification
 * - Amount conversion helpers
 *
 * NOTE:
 * This version still uses the existing global Razorpay instance.
 * Multi-school Razorpay credentials will be added in the next step.
 */
export class PaymentService {

  /**
   * Create Razorpay order
   *
   * @param {Object} orderData
   * @param {number} orderData.amount Amount in rupees
   * @param {string} orderData.studentName Student name
   * @param {string|number} orderData.studentId Student ID
   * @param {string|number} orderData.invoiceId Invoice ID
   * @param {number} orderData.totalAmount Total invoice amount
   */
  static async createOrder(orderData) {
    try {
      const {
        amount,
        studentName,
        studentId,
        invoiceId,
        totalAmount
      } = orderData;

      if (!amount || !studentName || !studentId || !invoiceId) {
        throw new Error(
          'Missing required fields: amount, studentName, studentId, invoiceId'
        );
      }

      if (Number(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const amountInPaise = Math.round(Number(amount) * 100);

      logger.info(
        `Creating Razorpay order: ₹${amount} = ${amountInPaise} paise`
      );

      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `invoice_${invoiceId}_${Date.now()}`,
        notes: {
          studentName: String(studentName),
          studentId: String(studentId),
          invoiceId: String(invoiceId),
          totalAmount: totalAmount != null ? String(totalAmount) : ''
        }
      });

      logger.info(`✅ Razorpay order created: ${order.id}`);

      return {
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        studentName,
        studentId,
        invoiceId,
        status: order.status
      };

    } catch (error) {
      logger.error(`❌ Error creating Razorpay order: ${error.message}`);
      throw new Error(`Failed to create payment order: ${error.message}`);
    }
  }


  /**
   * Verify Razorpay payment signature
   *
   * Uses:
   * HMAC-SHA256(orderId|paymentId, Razorpay Key Secret)
   *
   * IMPORTANT:
   * This is NOT the webhook secret.
   */
  static verifyPaymentSignature(paymentData, keySecret) {
    try {
      const {
        orderId,
        paymentId,
        signature
      } = paymentData;

      if (!orderId || !paymentId || !signature || !keySecret) {
        logger.warn('Missing parameters for payment signature verification');
        return false;
      }

      const body = `${orderId}|${paymentId}`;

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(signature, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        logger.warn(`❌ Invalid payment signature for ${paymentId}`);
        return false;
      }

      const isValid = crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

      if (isValid) {
        logger.info(`✅ Payment signature verified: ${paymentId}`);
      } else {
        logger.warn(`❌ Invalid payment signature: ${paymentId}`);
      }

      return isValid;

    } catch (error) {
      logger.error(
        `Error verifying payment signature: ${error.message}`
      );
      return false;
    }
  }


  /**
   * Get payment details from Razorpay
   */
  static async getPaymentDetails(paymentId) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      logger.info(`Fetching Razorpay payment: ${paymentId}`);

      const payment = await razorpayInstance.payments.fetch(paymentId);

      logger.info(
        `✅ Payment details fetched: ${paymentId}, status=${payment.status}`
      );

      return {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        currency: payment.currency,
        description: payment.description,
        notes: payment.notes,
        acquirer_data: payment.acquirer_data,
        order_id: payment.order_id,
        created_at: payment.created_at
      };

    } catch (error) {
      logger.error(
        `Error fetching payment details: ${error.message}`
      );

      throw new Error(
        `Failed to fetch payment details: ${error.message}`
      );
    }
  }


  /**
   * Process Razorpay refund
   *
   * @param {string} paymentId Razorpay payment ID
   * @param {number|null} amount Amount in paise
   */
  static async refundPayment(paymentId, amount = null) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      logger.info(`Processing Razorpay refund: ${paymentId}`);

      const refundData =
        amount != null
          ? { amount: Number(amount) }
          : {};

      const refund = await razorpayInstance.payments.refund(
        paymentId,
        refundData
      );

      logger.info(`✅ Refund processed: ${refund.id}`);

      return {
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount,
        status: refund.status,
        createdAt: refund.created_at
          ? new Date(refund.created_at * 1000)
          : new Date()
      };

    } catch (error) {
      logger.error(
        `Error processing refund: ${error.message}`
      );

      throw new Error(
        `Failed to process refund: ${error.message}`
      );
    }
  }


  /**
   * Get transactions from our database
   *
   * IMPORTANT:
   * Transactions are filtered by school_id when provided.
   * This prevents one school from seeing another school's payments.
   */
  static async getTransactions(
    filters = {},
    limit = 10,
    offset = 0,
    schoolId = null
  ) {
    try {
      const where = {};

      if (schoolId) {
        where.school_id = BigInt(schoolId);
      }

      if (filters.status) {
        where.status = filters.status;
      }

      const transactions = await prisma.payment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              admission_number: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoice_number: true,
              total_amount: true
            }
          }
        },
        orderBy: {
          payment_date: 'desc'
        },
        take: Number(limit),
        skip: Number(offset)
      });

      return transactions.map((payment) => ({
        id: payment.id.toString(),

        studentName: [
          payment.student?.first_name,
          payment.student?.last_name
        ]
          .filter(Boolean)
          .join(' ') || 'N/A',

        studentId: payment.student_id.toString(),

        admissionNumber:
          payment.student?.admission_number || null,

        amount: Number(payment.amount),

        paymentMethod: payment.payment_method,

        status: payment.status,

        paymentDate: payment.payment_date,

        invoiceId: payment.invoice_id.toString(),

        invoiceNumber:
          payment.invoice?.invoice_number || null,

        transactionId:
          payment.transaction_id || null,

        paymentNumber:
          payment.payment_number,

        remarks:
          payment.remarks || null
      }));

    } catch (error) {
      logger.error(
        `Get transactions error: ${error.message}`
      );

      throw new Error(
        `Failed to get transactions: ${error.message}`
      );
    }
  }


  /**
   * Count transactions
   *
   * Also supports school-level isolation.
   */
  static async countTransactions(
    filters = {},
    schoolId = null
  ) {
    try {
      const where = {};

      if (schoolId) {
        where.school_id = BigInt(schoolId);
      }

      if (filters.status) {
        where.status = filters.status;
      }

      return await prisma.payment.count({
        where
      });

    } catch (error) {
      logger.error(
        `Count transactions error: ${error.message}`
      );

      throw new Error(
        `Failed to count transactions: ${error.message}`
      );
    }
  }


  /**
   * Verify Razorpay webhook signature
   *
   * Uses:
   * HMAC-SHA256(rawWebhookBody, webhookSecret)
   *
   * IMPORTANT:
   * Webhook secret is different from Razorpay Key Secret.
   */
  static verifyWebhookSignature(
    webhookBody,
    webhookSignature,
    webhookSecret
  ) {
    try {
      if (
        !webhookBody ||
        !webhookSignature ||
        !webhookSecret
      ) {
        logger.warn(
          'Missing parameters for webhook signature verification'
        );

        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookBody)
        .digest('hex');

      const expectedBuffer =
        Buffer.from(expectedSignature, 'hex');

      const receivedBuffer =
        Buffer.from(webhookSignature, 'hex');

      if (
        expectedBuffer.length !== receivedBuffer.length
      ) {
        logger.warn('❌ Invalid webhook signature');
        return false;
      }

      const isValid = crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

      if (isValid) {
        logger.info('✅ Razorpay webhook signature verified');
      } else {
        logger.warn('❌ Invalid Razorpay webhook signature');
      }

      return isValid;

    } catch (error) {
      logger.error(
        `Error verifying webhook signature: ${error.message}`
      );

      return false;
    }
  }


  /**
   * Convert paise to rupees
   */
  static paiseToRupees(paise) {
    return Number(paise) / 100;
  }


  /**
   * Convert rupees to paise
   */
  static rupeesToPaise(rupees) {
    return Math.round(Number(rupees) * 100);
  }
}


export default PaymentService;