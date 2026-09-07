import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST - Create Razorpay order
router.post('/razorpay/create-order', paymentController.createRazorpayOrder);

// POST - Verify Razorpay payment
router.post('/razorpay/verify', paymentController.verifyRazorpayPayment);

// POST - Record payment for an invoice
router.post('/:invoiceId/record', paymentController.recordPayment);

// GET - Get payment history for an invoice
router.get('/:invoiceId/history', paymentController.getPaymentHistory);

export default router;
