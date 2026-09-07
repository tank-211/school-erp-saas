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
router.post('/create-order', paymentController.createOrder);

/**
 * POST /api/payments/verify
 * Verify payment signature and update fee payment record (MAIN VERIFICATION ENDPOINT)
 * Body: { orderId, paymentId, signature, studentId, amount }
 */
router.post('/verify', paymentController.verifyPayment);

/**
 * POST /api/payments/verify-payment
 * DEPRECATED: Use /verify instead
 * Verify payment signature and update fee payment record
 * Body: { orderId, paymentId, signature, studentId, amount }
 */
router.post('/verify-payment', paymentController.verifyPayment);

/**
 * POST /api/payments/webhook
 * Razorpay webhook endpoint
 * This is called by Razorpay's servers (not authenticated)
 */
router.post('/webhook', paymentController.handlePaymentWebhook);

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
