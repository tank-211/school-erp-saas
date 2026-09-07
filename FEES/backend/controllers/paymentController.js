import PaymentService from '../services/paymentService.js';
import logger from '../config/logger.js';

/**
 * Payment Controller - Complete Razorpay Integration
 * Handles: Order creation, verification, status checking, refunds
 */

/**
 * POST /api/payments/create-order
 * Step 1: Frontend → Backend to create Razorpay Order
 * 
 * SECURITY:
 * - Backend has Secret Key, frontend doesn't
 * - Only public Order ID is returned to frontend
 * - Frontend uses Order ID + Public Key for Razorpay modal
 * 
 * Body: { amount, studentName, studentId, invoiceId, totalAmount }
 * Returns: { orderId, amount, currency, razorpayKey }
 */
export const createOrder = async (req, res) => {
  try {
    const { amount, studentName, studentId, invoiceId, totalAmount } = req.body;

    // Validate inputs
    if (!amount || !studentName || !studentId || !invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, studentName, studentId, invoiceId',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // Create order using PaymentService
    const orderData = await PaymentService.createOrder({
      amount,
      studentName,
      studentId,
      invoiceId,
      totalAmount,
    });

    // Return order data + public API key to frontend
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: orderData.orderId,
        amount: orderData.amount, // in paise
        currency: orderData.currency,
        razorpayKey: process.env.RAZORPAY_KEY_ID, // PUBLIC KEY ONLY
        studentName: orderData.studentName,
        studentId: orderData.studentId,
        invoiceId: orderData.invoiceId,
      },
    });
  } catch (error) {
    logger.error(`Error in createOrder: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/verify
 * Step 2: Frontend → Backend to verify payment signature
 * 
 * SECURITY:
 * - Frontend sends: orderId, paymentId, signature (from Razorpay)
 * - Backend verifies using Secret Key (HMAC-SHA256)
 * - Only backend can verify because only backend has Secret Key
 * - Prevents fake/spoofed payments
 * 
 * Body: { orderId, paymentId, signature, studentId, amount }
 * Returns: { success: true/false, paymentStatus, amountPaid }
 */
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, studentId, amount } = req.body;

    // Validate inputs
    if (!orderId || !paymentId || !signature || !studentId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, paymentId, signature, studentId, amount',
      });
    }

    logger.info(`Verifying payment: ${paymentId} for student: ${studentId}`);

    // SECURITY: Verify signature using Secret Key
    // This is the critical step - only backend can do this
    const isSignatureValid = PaymentService.verifyPaymentSignature(
      { orderId, paymentId, signature },
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isSignatureValid) {
      logger.warn(`Invalid signature for payment ${paymentId}`);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
      });
    }

    logger.info(`✅ Signature verified for payment ${paymentId}`);

    // Optional: Fetch payment details from Razorpay to double-check
    let paymentDetails = null;
    try {
      paymentDetails = await PaymentService.getPaymentDetails(paymentId);
      logger.info(`Payment status from Razorpay: ${paymentDetails.status}`);
    } catch (error) {
      logger.warn(`Could not fetch payment details: ${error.message}`);
    }

    // Payment is verified! Now you can:
    // 1. Update database (mark payment as success)
    // 2. Send confirmation email
    // 3. Trigger other business logic

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId,
        orderId,
        studentId,
        amount: PaymentService.paiseToRupees(amount), // Convert to rupees
        status: paymentDetails?.status || 'captured',
        verifiedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error(`Error in verifyPayment: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * POST /api/payments/webhook
 * Razorpay webhook handler for asynchronous payment updates
 * This endpoint receives notifications from Razorpay when payment status changes
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const event = req.body.event;
    const payload = req.body.payload;

    logger.info(`Webhook received: ${event}`);

    // Handle different payment events
    switch (event) {
      case 'payment.authorized':
        // Payment has been authorized
        await handlePaymentAuthorized(payload.payment);
        break;
GET /api/payments/status/:paymentId
 * Get payment status from Razorpay
 * 
 * Query params: paymentId
 * Returns: { status, amount, method, email }
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required',
      });
    }

    const paymentDetails = await PaymentService.getPaymentDetails(paymentId);

    return res.status(200).json({
      success: true,
      data: paymentDetails,
    });
  } catch (error) {
    logger.error(`Error in getPaymentStatus: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};     res,
      'Payment details retrieved successfully',
      {
        paymentId: paymentDetails.id,
        status: paymentDetails.status,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        method: paymentDetails.method,
        vpa: paymentDetails.vpa, // UPI ID for UPI payments
        createdAt: new Date(paymentDetails.created_at * 1000),
      }
    );
  } catch (error) {
    logger.error(`Error in getPaymentStatus: ${error.message}`);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/payments/refund
 * Refund a payment
 * Body: { paymentId, amount (optional) }
 */
export const refundPayment = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return sendErrorResponse(res, 'Payment ID is required', 400);
    }

    const refundDetails = await PaymentService.refundPayment(paymentId, amount);

    return sendSuccessResponse(
      res,
      'Refund processed successfully',
      {
        refundId: refundDetails.id,
        paymentId,
        amount: refundDetails.amount,
        status: refundDetails.status,
      }
    );
  } catch (error) {
    logger.error(`Error in refundPayment: ${error.message}`);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/payments/transactions/list
 * Get all transactions with pagination and filtering
 */
export const getTransactions = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status, page = 1 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;

    const paginationLimit = parseInt(limit);
    const paginationOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * paginationLimit;

    const transactions = await PaymentService.getTransactions(filters, paginationLimit, paginationOffset);
    const total = await PaymentService.countTransactions(filters);

    return sendSuccessResponse(res, 'Transactions retrieved successfully', {
      data: transactions,
      total,
      limit: paginationLimit,
      offset: paginationOffset,
      page: parseInt(page)
    });
  } catch (error) {
    logger.error(`Get transactions error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export default {
  createOrder,
  verifyPayment,
  handlePaymentWebhook,
  getPaymentStatus,
  refundPayment,
  getTransactions,
};
POST /api/payments/refund
 * Process refund for a payment
 * Body: { paymentId, amount (optional) }
 */
export const refundPayment = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required',
      });
    }

    const refundData = await PaymentService.refundPayment(paymentId, amount);

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: refundData,
    });
  } catch (error) {
    logger.error(`Error in refundPayment: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/webhook
 * Razorpay webhook endpoint
 * Razorpay servers call this when payment status changes
 * 
 * Headers: X-Razorpay-Signature
 * Body: Raw webhook data from Razorpay
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = req.rawBody || JSON.stringify(req.body);

    logger.info('Received Razorpay webhook');

    // Verify webhook is authentic
    const isWebhookValid = PaymentService.verifyWebhookSignature(
      webhookBody,
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isWebhookValid) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Process webhook events
    const event = req.body.event;
    const payload = req.body.payload;

    logger.info(`Processing webhook event: ${event}`);

    switch (event) {
      case 'payment.authorized':
        logger.info(`Payment authorized: ${payload.payment.entity.id}`);
        // Handle payment authorization
        break;

      case 'payment.failed':
        logger.warn(`Payment failed: ${payload.payment.entity.id}`);
        // Handle payment failure
        break;

      case 'payment.captured':
        logger.info(`Payment captured: ${payload.payment.entity.id}`);
        // Handle payment capture
        break;

      default:
        logger.info(`Webhook event not handled: ${event}`);
    }

    // Acknowledge webhook to Razorpay
    return res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    logger.error(`Error in webhook handler: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  refundPayment,
  handlePaymentWebhook