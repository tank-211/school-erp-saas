import { FeePaymentService } from '../services/feePaymentService.js';
import { sendSuccessResponse, sendErrorResponse, createPaginatedResponse, getPaginationParams } from '../utils/responseHelper.js';
import logger from '../config/logger.js';

export const createFeePayment = async (req, res, next) => {
  try {
    const feePayment = await FeePaymentService.createFeePayment(req.validatedData);
    return sendSuccessResponse(res, 'Fee payment created successfully', feePayment, 201);
  } catch (error) {
    logger.error(`Create fee payment error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionId, notes } = req.validatedData;

    const feePayment = await FeePaymentService.recordPayment(
      id,
      { amount, paymentMethod, transactionId, notes },
      req.user.userId
    );

    return sendSuccessResponse(res, 'Payment recorded successfully', feePayment);
  } catch (error) {
    logger.error(`Record payment error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

/**
 * Submit fee payment from frontend
 * Accepts JSON data, validates amountPaid <= totalAmount
 * Saves to database and returns 201 with created record
 */
export const submitFeePayment = async (req, res, next) => {
  try {
    // req.validatedData contains the validated payload from submitFeePaymentSchema
    const paymentData = req.validatedData;

    // Additional validation: ensure amountPaid does not exceed totalAmount
    if (paymentData.amountPaid > paymentData.totalAmount) {
      logger.warn(`Validation failed: amountPaid (${paymentData.amountPaid}) exceeds totalAmount (${paymentData.totalAmount})`);
      return sendErrorResponse(
        res,
        `Amount paid (₹${paymentData.amountPaid}) cannot exceed total amount (₹${paymentData.totalAmount})`,
        400
      );
    }

    // Call service to save fee payment to database
    const createdFeePayment = await FeePaymentService.submitFeePayment(paymentData);

    logger.info(`Fee payment submitted successfully: ${createdFeePayment._id}`);

    // Return 201 Created status with the created record
    return sendSuccessResponse(
      res,
      'Fee payment submitted and saved successfully',
      createdFeePayment,
      201
    );
  } catch (error) {
    logger.error(`Submit fee payment error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getPendingPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, student } = req.query;

    const filters = {};
    if (student) {
      filters.student = student;
    }

    const { skip, limit: paginationLimit } = getPaginationParams(page, limit);
    const { payments, total } = await FeePaymentService.getPendingPayments(filters, skip, paginationLimit);

    const response = createPaginatedResponse(payments, total, parseInt(page), paginationLimit);
    return sendSuccessResponse(res, 'Pending payments retrieved successfully', response);
  } catch (error) {
    logger.error(`Get pending payments error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getOverduePayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, gracePeriodDays = 0 } = req.query;

    const { skip, limit: paginationLimit } = getPaginationParams(page, limit);
    const { payments, total } = await FeePaymentService.getOverduePayments(
      parseInt(gracePeriodDays),
      skip,
      paginationLimit
    );

    const response = createPaginatedResponse(payments, total, parseInt(page), paginationLimit);
    return sendSuccessResponse(res, 'Overdue payments retrieved successfully', response);
  } catch (error) {
    logger.error(`Get overdue payments error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await FeePaymentService.getDashboardStats();
    return sendSuccessResponse(res, 'Dashboard stats retrieved successfully', stats);
  } catch (error) {
    logger.error(`Get dashboard stats error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getMonthlyCollectionData = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const data = await FeePaymentService.getMonthlyCollectionData(parseInt(year));
    return sendSuccessResponse(res, 'Monthly collection data retrieved successfully', data);
  } catch (error) {
    logger.error(`Get monthly collection data error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getFinancialDashboardData = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const dashboardData = await FeePaymentService.getFinancialDashboardData(parseInt(year));
    return sendSuccessResponse(res, 'Financial dashboard data retrieved successfully', dashboardData);
  } catch (error) {
    logger.error(`Get financial dashboard data error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getRecentTransactions = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const transactions = await FeePaymentService.getRecentTransactions(parseInt(limit) || 5);
    return sendSuccessResponse(res, 'Recent transactions retrieved successfully', transactions);
  } catch (error) {
    logger.error(`Get recent transactions error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};
