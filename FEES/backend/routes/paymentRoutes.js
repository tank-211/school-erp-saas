import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Payment Routes
 * These routes handle payment order creation, verification, and webhook callbacks
 */

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for UPI payment
 * Public route (frontend needs to call this)
 * Body: { amount, studentName, studentId, invoiceId, totalAmount }
 */
router.post(
  '/create-order',
  authenticateToken,
  paymentController.createOrder
);

router.post(
  '/verify',
  authenticateToken,
  paymentController.verifyPayment
);

router.post(
  '/verify-payment',
  authenticateToken,
  paymentController.verifyPayment
);

// DO NOT add authenticateToken to webhook
router.post(
  '/webhook',
  paymentController.handlePaymentWebhook
);

/**
 * GET /api/payments/status/:paymentId
 * Get payment status from Razorpay
 */
router.get('/status/:paymentId', authenticateToken, paymentController.getPaymentStatus);

/**
 * POST /api/payments/refund
 * Refund a payment (admin only)
 * Body: { paymentId, amount (optional) }
 */
router.post('/refund', authenticateToken, paymentController.refundPayment);

/**
 * GET /api/payments/transactions/list
 * Get all transactions with pagination and filtering
 */
router.get('/transactions/list', authenticateToken, paymentController.getTransactions);

export default router;
