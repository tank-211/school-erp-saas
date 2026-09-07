// ================================================================
// DASHBOARD CONTROLLER - API Endpoints
// ================================================================

import { Request, Response } from 'express';
import DashboardService from '../services/dashboardService';
import { sendSuccess, sendError } from '../utils/responseHelper';
import logger from '../config/logger';

const getSchoolId = (req: Request): string => {
  if (!req.user?.schoolId) {
    throw new Error('School ID is missing from authenticated user');
  }

  return req.user.schoolId.toString();
};

/**
 * GET /api/fee-payments/dashboard/stats
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);

    const metrics = await DashboardService.getDashboardMetrics(schoolId);

    return sendSuccess(
      res,
      'Dashboard metrics retrieved successfully',
      metrics
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Dashboard stats error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/monthly
 */
export const getMonthlyTrend = async (req: Request, res: Response) => {
  try {
    const schoolId = getSchoolId(req);

    const { year } = req.query;

    const yearValue = year
      ? parseInt(year as string, 10)
      : new Date().getFullYear();

    const monthlyData =
      await DashboardService.getMonthlyCollectionTrend(
        schoolId,
        yearValue
      );

    return sendSuccess(
      res,
      `Monthly collection trend for ${yearValue} retrieved successfully`,
      monthlyData
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Monthly trend error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/payment-methods
 */
export const getPaymentMethodStats = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const distribution =
      await DashboardService.getPaymentMethodDistribution(schoolId);

    return sendSuccess(
      res,
      'Payment method distribution retrieved successfully',
      distribution
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Payment method stats error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/recent-transactions
 */
export const getRecentTransactions = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const { limit = 10 } = req.query;

    const limitValue = Math.min(
      parseInt(limit as string, 10) || 10,
      50
    );

    const transactions =
      await DashboardService.getRecentTransactions(
        schoolId,
        limitValue
      );

    return sendSuccess(
      res,
      `Last ${limitValue} transactions retrieved successfully`,
      transactions
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Recent transactions error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/status-distribution
 */
export const getStatusDistribution = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const distribution =
      await DashboardService.getPaymentStatusDistribution(schoolId);

    return sendSuccess(
      res,
      'Payment status distribution retrieved successfully',
      distribution
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Status distribution error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/by-class
 */
export const getCollectionByClass = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const classMetrics =
      await DashboardService.getCollectionByClass(schoolId);

    return sendSuccess(
      res,
      'Collection by class retrieved successfully',
      classMetrics
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Collection by class error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/outstanding
 */
export const getOutstandingBalances = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const { limit = 20 } = req.query;

    const limitValue = Math.min(
      parseInt(limit as string, 10) || 20,
      100
    );

    const outstanding =
      await DashboardService.getOutstandingBalances(
        schoolId,
        limitValue
      );

    return sendSuccess(
      res,
      `Top ${limitValue} outstanding balances retrieved successfully`,
      outstanding
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Outstanding balances error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/refund-stats
 */
export const getRefundStats = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const stats =
      await DashboardService.getRefundStats(schoolId);

    return sendSuccess(
      res,
      'Refund statistics retrieved successfully',
      stats
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Refund stats error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/daily-trend
 */
export const getDailyTrend = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const { days = 30 } = req.query;

    const daysValue = Math.min(
      parseInt(days as string, 10) || 30,
      365
    );

    const dailyData =
      await DashboardService.getDailyCollectionTrend(
        schoolId,
        daysValue
      );

    return sendSuccess(
      res,
      `Daily collection trend for last ${daysValue} days retrieved successfully`,
      dailyData
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Daily trend error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/overdue
 */
export const getOverdueInvoices = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const overdueInvoices =
      await DashboardService.getOverdueInvoices(schoolId);

    return sendSuccess(
      res,
      'Overdue invoices retrieved successfully',
      overdueInvoices
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Overdue invoices error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

/**
 * GET /api/fee-payments/dashboard/summary
 */
export const getDashboardSummary = async (
  req: Request,
  res: Response
) => {
  try {
    const schoolId = getSchoolId(req);

    const currentYear = new Date().getFullYear();

    const [
      metrics,
      monthlyTrend,
      paymentMethods,
      recentTransactions,
      statusDistribution,
      classMetrics,
      overdueInvoices
    ] = await Promise.all([
      DashboardService.getDashboardMetrics(schoolId),

      DashboardService.getMonthlyCollectionTrend(
        schoolId,
        currentYear
      ),

      DashboardService.getPaymentMethodDistribution(
        schoolId
      ),

      DashboardService.getRecentTransactions(
        schoolId,
        10
      ),

      DashboardService.getPaymentStatusDistribution(
        schoolId
      ),

      DashboardService.getCollectionByClass(
        schoolId
      ),

      DashboardService.getOverdueInvoices(
        schoolId
      )
    ]);

    const summary = {
      metrics,
      monthlyTrend,
      paymentMethods,
      recentTransactions,
      statusDistribution,
      classMetrics,
      overdueCount: overdueInvoices.length,
      timestamp: new Date().toISOString()
    };

    return sendSuccess(
      res,
      'Dashboard summary retrieved successfully',
      summary
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Dashboard summary error: ${errorMessage}`);

    return sendError(res, errorMessage);
  }
};

export default {
  getDashboardStats,
  getMonthlyTrend,
  getPaymentMethodStats,
  getRecentTransactions,
  getStatusDistribution,
  getCollectionByClass,
  getOutstandingBalances,
  getRefundStats,
  getDailyTrend,
  getOverdueInvoices,
  getDashboardSummary
};