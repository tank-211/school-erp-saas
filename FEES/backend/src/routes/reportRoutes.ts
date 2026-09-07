import express from 'express';
import reportController from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/reports/export
 * Export comprehensive fee report as PDF
 * Requires: ADMIN, ACCOUNTANT role
 */
router.get(
  '/export',
  authorize('ADMIN', 'ACCOUNTANT'),
  reportController.exportReport
);

/**
 * GET /api/reports/dashboard-stats
 * Get current dashboard statistics
 * Requires: ADMIN, ACCOUNTANT role
 */
router.get(
  '/dashboard-stats',
  authorize('ADMIN', 'ACCOUNTANT'),
  reportController.exportDashboardStats
);

/**
 * GET /api/reports/transactions/csv
 * Export recent transactions as CSV
 * Query params: limit (default: 50)
 * Requires: ADMIN, ACCOUNTANT role
 */
router.get(
  '/transactions/csv',
  authorize('ADMIN', 'ACCOUNTANT'),
  reportController.exportTransactionsCSV
);

/**
 * GET /api/reports/pending-payments/csv
 * Export pending payments as CSV
 * Query params: limit (default: 100)
 * Requires: ADMIN, ACCOUNTANT role
 */
router.get(
  '/pending-payments/csv',
  authorize('ADMIN', 'ACCOUNTANT'),
  reportController.exportPendingPaymentsCSV
);

/**
 * GET /api/reports/refunds/csv
 * Export refund requests as CSV
 * Query params: limit (default: 50)
 * Requires: ADMIN, ACCOUNTANT role
 */
router.get(
  '/refunds/csv',
  authorize('ADMIN', 'ACCOUNTANT'),
  reportController.exportRefundsCSV
);

/**
 * GET /api/reports/formats
 * Get available report formats
 * Requires: ADMIN, ACCOUNTANT role
 */
router.get(
  '/formats',
  authorize('ADMIN', 'ACCOUNTANT'),
  reportController.getAvailableFormats
);

export default router;
