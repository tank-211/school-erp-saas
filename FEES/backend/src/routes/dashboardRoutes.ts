// ================================================================
// DASHBOARD ROUTES
// ================================================================
// API routes for all dashboard endpoints
// ================================================================

import express from 'express';
import dashboardController from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * Returns: Dashboard metric cards (Total Collected, Pending, Overdue, Refunds)
 * Access: All authenticated users
 */
router.get('/stats', dashboardController.getDashboardStats);

/**
 * GET /api/dashboard/monthly
 * Query: year (optional)
 * Returns: Monthly collection trend for bar chart
 * Access: All authenticated users
 */
router.get('/monthly', dashboardController.getMonthlyTrend);

/**
 * GET /api/dashboard/payment-methods
 * Returns: Payment method distribution for donut chart
 * Access: All authenticated users
 */
router.get('/payment-methods', dashboardController.getPaymentMethodStats);

/**
 * GET /api/dashboard/recent-transactions
 * Query: limit (optional, max 50, default 10)
 * Returns: Recent transaction records for table
 * Access: All authenticated users
 */
router.get('/recent-transactions', dashboardController.getRecentTransactions);

/**
 * GET /api/dashboard/status-distribution
 * Returns: Payment status breakdown
 * Access: All authenticated users
 */
router.get('/status-distribution', dashboardController.getStatusDistribution);

/**
 * GET /api/dashboard/by-class
 * Returns: Collection metrics grouped by class
 * Access: Admin, Accountant
 */
router.get(
  '/by-class',
  authorize('ADMIN', 'ACCOUNTANT'),
  dashboardController.getCollectionByClass
);

/**
 * GET /api/dashboard/outstanding
 * Query: limit (optional, max 100, default 20)
 * Returns: Students with outstanding balances
 * Access: Admin, Accountant
 */
router.get(
  '/outstanding',
  authorize('ADMIN', 'ACCOUNTANT'),
  dashboardController.getOutstandingBalances
);

/**
 * GET /api/dashboard/refund-stats
 * Returns: Refund statistics by status
 * Access: Admin, Accountant
 */
router.get(
  '/refund-stats',
  authorize('ADMIN', 'ACCOUNTANT'),
  dashboardController.getRefundStats
);

/**
 * GET /api/dashboard/daily-trend
 * Query: days (optional, max 365, default 30)
 * Returns: Daily collection trend
 * Access: Admin, Accountant
 */
router.get(
  '/daily-trend',
  authorize('ADMIN', 'ACCOUNTANT'),
  dashboardController.getDailyTrend
);

/**
 * GET /api/dashboard/overdue
 * Returns: List of overdue invoices
 * Access: Admin, Accountant
 */
router.get(
  '/overdue',
  authorize('ADMIN', 'ACCOUNTANT'),
  dashboardController.getOverdueInvoices
);

/**
 * GET /api/dashboard/summary
 * Returns: Complete dashboard data (aggregated endpoint)
 * Use this for initial page load to reduce API calls
 * Access: All authenticated users
 */
router.get('/summary', dashboardController.getDashboardSummary);

export default router;
