import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Razorpay webhook: called by Razorpay, no login; checked by signature instead
router.post('/razorpay/webhook/:schoolId', paymentController.razorpayWebhook);

// All other routes require authentication
router.use(authenticate);

// GET - Can this school take online payments?
router.get('/razorpay/status', paymentController.razorpayStatus);

// POST - Create Razorpay order
router.post('/razorpay/create-order', paymentController.createRazorpayOrder);

// POST - Verify Razorpay payment
router.post('/razorpay/verify', paymentController.verifyRazorpayPayment);

// POST - Record payment for an invoice (ADMIN/ACCOUNTANT only)
router.post('/:invoiceId/record', authorize('ADMIN', 'ACCOUNTANT'), paymentController.recordPayment);

// GET - Get payment history for an invoice
router.get('/:invoiceId/history', paymentController.getPaymentHistory);

export default router;
