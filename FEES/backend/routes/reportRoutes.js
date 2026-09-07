import express from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/reports/export
 * Export comprehensive fee report as PDF
 * Requires: admin, accountant role
 */
router.get(
  '/export',
  authorizeRole('admin', 'accountant'),
  ReportController.exportReport
);

/**
 * GET /api/reports/dashboard-stats
 * Get current dashboard statistics
 * Requires: admin, accountant role
 */
router.get(
  '/dashboard-stats',
  authorizeRole('admin', 'accountant'),
  ReportController.exportDashboardStats
);

/**
 * GET /api/reports/transactions/csv
 * Export recent transactions as CSV
 * Query params: limit (default: 50)
 * Requires: admin, accountant role
 */
router.get(
  '/transactions/csv',
  authorizeRole('admin', 'accountant'),
  ReportController.exportTransactionsCSV
);

/**
 * GET /api/reports/pending-payments/csv
 * Export pending payments as CSV
 * Query params: limit (default: 100)
 * Requires: admin, accountant role
 */
router.get(
  '/pending-payments/csv',
  authorizeRole('admin', 'accountant'),
  ReportController.exportPendingPaymentsCSV
);

/**
 * GET /api/reports/refunds/csv
 * Export refund requests as CSV
 * Query params: limit (default: 50)
 * Requires: admin, accountant role
 */
router.get(
  '/refunds/csv',
  authorizeRole('admin', 'accountant'),
  ReportController.exportRefundsCSV
);

/**
 * GET /api/reports/formats
 * Get list of available report formats
 */
router.get('/formats', ReportController.getAvailableFormats);

export default router;
