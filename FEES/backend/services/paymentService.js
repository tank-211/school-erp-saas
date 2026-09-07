import { razorpayInstance } from '../config/razorpay.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

/**
 * Payment Service - Complete Razorpay Integration
 * Handles: Order creation, signature verification, payment status checks, refunds
 * IMPORTANT: Secret Key (RAZORPAY_KEY_SECRET) is NEVER exposed to frontend
 */
export class PaymentService {
  /**
   * Step 1: Create a Razorpay order (Backend → Razorpay API)
   * Frontend calls backend /api/payments/create-order
   * Backend uses Secret Key to create order on Razorpay servers
   * Only public Order ID is sent back to frontend
   *
   * @param {Object} orderData - { amount (in rupees), studentName, studentId, invoiceId, totalAmount }
   * @returns {Object} - { orderId, amount (in paise), currency, studentName }
   */
  static async createOrder(orderData) {
    try {
      const { amount, studentName, studentId, invoiceId, totalAmount } = orderData;

      // Validate inputs
      if (!amount || !studentName || !studentId || !invoiceId) {
        throw new Error('Missing required fields: amount, studentName, studentId, invoiceId');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Razorpay requires amount in paise (1 rupee = 100 paise)
      const amountInPaise = Math.round(amount * 100);

      logger.info(`Creating Razorpay order: ₹${amount} = ${amountInPaise} paise`);

      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `invoice_${invoiceId}_${Date.now()}`,
        notes: {
          studentName,
          studentId,
          invoiceId,
          totalAmount,
        },
      });

      logger.info(`✅ Order created: ID=${order.id}`);

      return {
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        studentName,
        studentId,
        invoiceId,
        status: order.status,
      };
    } catch (error) {
      logger.error(`❌ Error creating order: ${error.message}`);
      throw new Error(`Failed to create payment order: ${error.message}`);
    }
  }

  /**
   * Step 2: Verify payment signature (Backend verification)
   * Frontend sends: orderId, paymentId, signature (from Razorpay)
   * Backend verifies using RAZORPAY_KEY_SECRET: HMAC-SHA256(orderId|paymentId)
   *
   * FIX: Use RAZORPAY_KEY_SECRET (not webhook secret) for payment signature verification.
   * FIX: Use crypto.timingSafeEqual to prevent timing attacks.
   *
   * @param {Object} paymentData - { orderId, paymentId, signature }
   * @param {string} keySecret - RAZORPAY_KEY_SECRET from .env (NOT webhook secret)
   * @returns {boolean} - True if signature is valid, false otherwise
   */
  static verifyPaymentSignature(paymentData, keySecret) {
    try {
      const { orderId, paymentId, signature } = paymentData;

      if (!orderId || !paymentId || !signature || !keySecret) {
        logger.warn('Missing parameters for signature verification');
        return false;
      }

      const body = `${orderId}|${paymentId}`;

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      // FIX: Use timingSafeEqual to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );

      if (isValid) {
        logger.info(`✅ Signature verified for payment ${paymentId}`);
      } else {
        logger.warn(`❌ Invalid signature for ${paymentId}`);
      }

      return isValid;
    } catch (error) {
      logger.error(`Error verifying signature: ${error.message}`);
      return false;
    }
  }

  /**
   * Step 3: Get payment details from Razorpay
   *
   * @param {string} paymentId - Payment ID from Razorpay
   * @returns {Object} - Payment details from Razorpay
   */
  static async getPaymentDetails(paymentId) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      logger.info(`Fetching payment details for: ${paymentId}`);

      const payment = await razorpayInstance.payments.fetch(paymentId);

      logger.info(`✅ Payment details fetched: Status=${payment.status}`);

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
      };
    } catch (error) {
      logger.error(`Error fetching payment details: ${error.message}`);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }

  /**
   * Step 4: Process refund (Admin/Staff only)
   *
   * @param {string} paymentId - Payment ID to refund
   * @param {number} amount - Amount in paise (optional, full refund if not provided)
   * @returns {Object} - Refund details
   */
  static async refundPayment(paymentId, amount = null) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      logger.info(`Processing refund for payment: ${paymentId}`);

      const refundData = amount ? { amount } : {};

      const refund = await razorpayInstance.payments.refund(paymentId, refundData);

      logger.info(`✅ Refund processed: ${refund.id}`);

      return {
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000),
      };
    } catch (error) {
      logger.error(`Error processing refund: ${error.message}`);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
<<<<<<< HEAD
   * Get all transactions with pagination and filtering
   */
  static async getTransactions(filters = {}, limit = 10, offset = 0) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const where = {};
      if (filters.status) {
        where.status = filters.status;
      }

      const transactions = await prisma.payment.findMany({
        where,
        include: {
          feePayment: {
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  studentId: true
                }
              }
            }
          }
        },
        orderBy: { transactionDate: 'desc' },
        take: limit,
        skip: offset
      });

      await prisma.$disconnect();

      return transactions.map(t => ({
        id: t.id,
        studentName: t.feePayment?.student 
          ? `${t.feePayment.student.firstName} ${t.feePayment.student.lastName}`
          : 'N/A',
        amount: Number(t.amount),
        method: t.paymentMethod,
        status: t.status,
        date: t.transactionDate,
        invoiceId: t.feePaymentId,
        transactionId: t.transactionId
      }));
    } catch (error) {
      logger.error(`Get transactions error: ${error.message}`);
      throw error;
=======
   * Verify webhook signature from Razorpay
   * Used for server-to-server webhook verification
   *
   * FIX: Added input validation guards (missing in original).
   * FIX: Use crypto.timingSafeEqual to prevent timing attacks.
   *
   * @param {string} webhookBody - Raw webhook body string from Razorpay
   * @param {string} webhookSignature - X-Razorpay-Signature header
   * @param {string} webhookSecret - RAZORPAY_WEBHOOK_SECRET
   * @returns {boolean} - True if webhook is authentic
   */
  static verifyWebhookSignature(webhookBody, webhookSignature, webhookSecret) {
    try {
      // FIX: Added missing input validation
      if (!webhookBody || !webhookSignature || !webhookSecret) {
        logger.warn('Missing parameters for webhook signature verification');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookBody)
        .digest('hex');

      // FIX: Use timingSafeEqual to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(webhookSignature, 'hex')
      );

      if (isValid) {
        logger.info('✅ Webhook signature verified');
      } else {
        logger.warn('❌ Invalid webhook signature');
      }

      return isValid;
    } catch (error) {
      logger.error(`Error verifying webhook: ${error.message}`);
      return false;
>>>>>>> fb830a8cde2f8184c9b1c9a6fa1b5ff18bd74c3f
    }
  }

  /**
<<<<<<< HEAD
   * Count transactions matching filters
   */
  static async countTransactions(filters = {}) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const where = {};
      if (filters.status) {
        where.status = filters.status;
      }

      const count = await prisma.payment.count({ where });
      await prisma.$disconnect();

      return count;
    } catch (error) {
      logger.error(`Count transactions error: ${error.message}`);
      throw error;
    }
=======
   * Calculate amount in rupees from paise
   * @param {number} paise - Amount in paise
   * @returns {number} - Amount in rupees
   */
  static paiseToRupees(paise) {
    return paise / 100;
  }

  /**
   * Calculate amount in paise from rupees
   * @param {number} rupees - Amount in rupees
   * @returns {number} - Amount in paise
   */
  static rupeesToPaise(rupees) {
    return Math.round(rupees * 100);
>>>>>>> fb830a8cde2f8184c9b1c9a6fa1b5ff18bd74c3f
  }
}

// FIX: Removed duplicate `export default` that caused a syntax error
export default PaymentService;