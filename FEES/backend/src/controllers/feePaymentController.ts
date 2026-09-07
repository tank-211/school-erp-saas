import { Request, Response } from 'express';
import feePaymentService from '../services/feePaymentService';
import { sendSuccess, sendError, getPaginationParams, getPaginationMeta } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';
import DashboardService from '../services/dashboardService';

export const createFeePayment = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, feeStructureId, totalAmount, dueDate } = req.body;
  const approvedBy = req.user?.id;

  const payment = await feePaymentService.createFeePayment({
    schoolId: req.user!.schoolId,
    studentId,
    feeStructureId,
    totalAmount,
    dueDate: new Date(dueDate),
    approvedBy,
  });

  logger.info('Fee payment created', { studentId, paymentId: payment.id });

  sendSuccess(res, 'Fee payment created successfully', payment, 201);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, paymentMethod, transactionId, notes } = req.body;

  const updated = await feePaymentService.recordPayment(
    id,
    req.user!.schoolId,
    amount,
    paymentMethod,
    transactionId,
    notes
  );

  logger.info('Payment recorded', { paymentId: id, amount });

  sendSuccess(res, 'Payment recorded successfully', updated, 200);
});

export const getPendingPayments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, courseId } = req.query;

  const { page: p, limit: l } = getPaginationParams({ page, limit });

  const result = await feePaymentService.getPendingPayments(
    p,
    l,
    req.user!.schoolId,
    courseId as string
  );

  sendSuccess(res, 'Pending payments retrieved successfully', result.payments, 200, {
    ...getPaginationMeta(p, l, result.total),
  });
});

export const getOverduePayments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, courseId } = req.query;

  const { page: p, limit: l } = getPaginationParams({ page, limit });

  const result = await feePaymentService.getOverduePayments(
    p,
    l,
    req.user!.schoolId,
    courseId as string
  );

  sendSuccess(res, 'Overdue payments retrieved successfully', result.payments, 200, {
    ...getPaginationMeta(p, l, result.total),
  });
});

export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return sendError(res, 'School ID is required', [], 400);
    }

    const metrics = await DashboardService.getDashboardMetrics(
      schoolId.toString()
    );

    sendSuccess(
      res,
      'Dashboard statistics retrieved successfully',
      {
        overallStats: {
          totalCollected: metrics.totalFeesCollected,
          totalPending: metrics.pendingPayments,
          totalOverdue: metrics.overduePayments,
          totalRefund: metrics.refundRequests,
        },
      },
      200
    );
  }
);

export const getMonthlyCollection = asyncHandler(
  async (req: Request, res: Response) => {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return sendError(res, 'School ID is required', [], 400);
    }

    const currentYear = new Date().getFullYear();

    const data =
      await DashboardService.getMonthlyCollectionTrend(
        schoolId.toString(),
        currentYear
      );

    sendSuccess(
      res,
      'Monthly collection data retrieved successfully',
      data,
      200
    );
  }
);

export const getPaymentMethodStats = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.user?.schoolId;

  if (!schoolId) {
    return sendError(res, 'School ID is required', [], 400);
  }

  const data = await DashboardService.getPaymentMethodDistribution(
    schoolId.toString()
  );

  sendSuccess(res, 'Payment method distribution retrieved successfully', data, 200);
});

export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const history = await feePaymentService.getFeePaymentHistory(studentId, req.user!.schoolId);

  sendSuccess(res, 'Payment history retrieved successfully', history, 200);
});

/**
 * Submit fee payment from frontend
 * Accepts JSON data, validates amountPaid <= totalAmount
 * Saves to PostgreSQL database via Prisma
 * Returns 201 Created with the created record
 */
export const submitFeePayment = asyncHandler(async (req: Request, res: Response) => {
  const { totalAmount, amountPaid, paymentMethod, paymentStatus, studentId, feeStructureId, dueDate, notes } = req.body;

  // Validate required fields
  if (!totalAmount || totalAmount <= 0) {
    return sendError(res, 'Total amount is required and must be greater than 0', [], 400);
  }

  if (amountPaid === undefined || amountPaid < 0) {
    return sendError(res, 'Amount paid is required and cannot be negative', [], 400);
  }

  // Validate amountPaid does not exceed totalAmount
  if (amountPaid > totalAmount) {
    logger.warn('Validation failed: amountPaid exceeds totalAmount', { amountPaid, totalAmount });
    return sendError(
      res,
      `Amount paid (₹${amountPaid}) cannot exceed total amount (₹${totalAmount})`,
      [],
      400
    );
  }

  if (!paymentMethod) {
    return sendError(res, 'Payment method is required', [], 400);
  }

  try {
    // Call service to save fee payment to database
    const createdFeePayment = await feePaymentService.submitFeePayment({
      schoolId: req.user!.schoolId,
      totalAmount,
      amountPaid,
      paymentMethod,
      paymentStatus,
      studentId,
      feeStructureId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    });

    logger.info('Fee payment submitted successfully', {
      invoiceId: createdFeePayment.invoice.id,
      paymentId: createdFeePayment.payment?.id ?? null,
      totalAmount,
      amountPaid,
      paymentMethod,
    });

    // Return 201 Created status with the created record
    sendSuccess(
      res,
      'Fee payment submitted and saved successfully',
      createdFeePayment,
      201
    );
  } catch (error) {
    logger.error('Error submitting fee payment', { error });
    throw error;
  }
});

export const getRecentTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return sendError(res, 'School ID is required', [], 400);
    }

    const rawLimit = Number(req.query.limit ?? 5);

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 5;

    const transactions =
      await DashboardService.getRecentTransactions(
        schoolId.toString(),
        limit
      );

    logger.info(
      'Recent transactions retrieved',
      {
        schoolId: schoolId.toString(),
        count: transactions.length
      }
    );

    sendSuccess(
      res,
      'Recent transactions retrieved successfully',
      transactions,
      200
    );
  }
);
