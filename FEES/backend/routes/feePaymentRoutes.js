import express from 'express';
import * as feePaymentController from '../controllers/feePaymentController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { createFeePaymentSchema, recordPaymentSchema, submitFeePaymentSchema } from '../validators/feePaymentValidator.js';

const router = express.Router();

// Protected routes
router.use(authenticateToken);

/**
 * POST /api/fee-payments
 * Create a new fee payment record
 * Required roles: admin, accountant
 */
router.post('/',
  authorizeRole('admin', 'accountant'),
  validateRequest(createFeePaymentSchema),
  feePaymentController.createFeePayment
);

/**
 * POST /api/fee-payments/submit
 * Submit fee payment from frontend with validation
 * Validates that amountPaid does not exceed totalAmount
 * Returns 201 with created record
 */
router.post('/submit',
  validateRequest(submitFeePaymentSchema),
  feePaymentController.submitFeePayment
);

/**
 * POST /api/fee-payments/:id/record-payment
 * Record a payment against an existing fee payment record
 * Required roles: admin, accountant
 */
router.post('/:id/record-payment',
  authorizeRole('admin', 'accountant'),
  validateRequest(recordPaymentSchema),
  feePaymentController.recordPayment
);

// Get a specific fee payment by ID
router.get('/:id', feePaymentController.getFeePaymentById);

router.get('/pending/list', feePaymentController.getPendingFees);

router.get('/pending', feePaymentController.getPendingPayments);

router.get('/overdue', feePaymentController.getOverduePayments);

/**
 * Dashboard Analytics Routes (more specific routes defined first)
 * Required roles: admin, accountant
 */

/**
 * GET /api/fee-payments/dashboard/stats
 * Returns total fee statistics including status breakdown and collection totals
 */
router.get('/dashboard/stats', 
  authorizeRole('admin', 'accountant'),
  feePaymentController.getDashboardStats
);

/**
 * GET /api/fee-payments/dashboard/monthly
 * Returns filtered monthly collection data based on req.query.year
 * Query params: ?year=2024 (default: current year)
 */
router.get('/dashboard/monthly', 
  authorizeRole('admin', 'accountant'),
  feePaymentController.getMonthlyCollectionData
);

/**
 * GET /api/fee-payments/dashboard/recent-transactions
 * Returns the latest transactions matching req.query.limit
 * Query params: ?limit=5 (default: 5)
 */
router.get('/dashboard/recent-transactions', 
  authorizeRole('admin', 'accountant'),
  feePaymentController.getRecentTransactions
);

/**
 * GET /api/fee-payments/dashboard
 * Get comprehensive dashboard data including stats, monthly collection, and recent transactions
 * This is a catch-all endpoint that returns all dashboard data at once
 * Required roles: admin, accountant
 */
router.get('/dashboard', 
  authorizeRole('admin', 'accountant'),
  feePaymentController.getFinancialDashboardData
);

export default router;
