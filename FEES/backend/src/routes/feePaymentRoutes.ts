import { Router } from 'express';
import * as feePaymentController from '../controllers/feePaymentController';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validateRequest, paginationValidator } from '../middleware/validation';

const router = Router();

// GET - Dashboard statistics (allow without authentication for now)
router.get(
  '/dashboard/stats',
  authenticate,
  feePaymentController.getDashboardStats
);

// GET - Monthly collection (allow without authentication for now)
router.get(
  '/dashboard/monthly',
  authenticate,
  feePaymentController.getMonthlyCollection
);

router.get(
  '/dashboard/payment-methods',
  authenticate,
  feePaymentController.getPaymentMethodStats
);

// GET - Recent transactions (allow without authentication for now)
router.get(
  '/dashboard/recent-transactions',
  authenticate,
  feePaymentController.getRecentTransactions
);

// GET - Pending payments (allow without authentication for now)
router.get(
  '/pending',
  authenticate,
  validateRequest(paginationValidator),
  feePaymentController.getPendingPayments
);

// GET - Overdue payments (allow without authentication for now)
router.get(
  '/overdue',
  authenticate,
  validateRequest(paginationValidator),
  feePaymentController.getOverduePayments
);

// GET - Payment history for student (allow without authentication for now)
router.get(
  '/student/:studentId/history',
  authenticate,
  feePaymentController.getPaymentHistory
);

// ===== ROUTES REQUIRING AUTHENTICATION BELOW =====
// All POST routes and admin operations require authentication
router.use(authenticate);

// POST - Create fee payment (ADMIN/ACCOUNTANT only)
router.post(
  '/',
  authorize('ADMIN', 'ACCOUNTANT'),
  feePaymentController.createFeePayment
);

// POST - Record payment (ADMIN/ACCOUNTANT only)
router.post(
  '/:id/record-payment',
  authorize('ADMIN', 'ACCOUNTANT'),
  feePaymentController.recordPayment
);

/**
 * POST /api/fee-payments/submit
 * Submit fee payment from frontend
 * Validates amountPaid <= totalAmount
 * Saves to database using Prisma
 * Returns 201 Created with the created record
 * Authentication: Required (JWT token)
 * Authorization: All authenticated users can submit
 */
router.post(
  '/submit',
  feePaymentController.submitFeePayment
);

export default router;
