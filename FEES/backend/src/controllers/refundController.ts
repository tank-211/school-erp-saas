import { Request, Response } from 'express';
import refundService from '../services/refundService';
import { sendSuccess, sendError, getPaginationParams, getPaginationMeta } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

export const createRefund = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, feePaymentId, amount, reason, description } = req.body;

  const refund = await refundService.createRefundRequest({
    schoolId: req.user!.schoolId,
    studentId,
    feePaymentId,
    amount,
    reason,
    description,
  });

  logger.info('Refund request created', { studentId, amount });

  sendSuccess(res, 'Refund request created successfully', refund, 201);
});

export const approveRefund = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const approvedBy = req.user?.id;

  if (!approvedBy) {
    return sendError(res, 'User not authenticated', [], 401);
  }

  const refund = await refundService.approveRefundRequest(id, req.user!.schoolId, approvedBy, notes);

  logger.info('Refund request approved', { refundId: id });

  sendSuccess(res, 'Refund request approved successfully', refund, 200);
});

export const rejectRefund = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const approvedBy = req.user?.id;

  if (!approvedBy) {
    return sendError(res, 'User not authenticated', [], 401);
  }

  const refund = await refundService.rejectRefundRequest(
    id,
    req.user!.schoolId,
    rejectionReason,
    approvedBy
  );

  logger.info('Refund request rejected', { refundId: id });

  sendSuccess(res, 'Refund request rejected successfully', refund, 200);
});

export const processRefund = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { refundMethod, bankDetails, transactionId } = req.body;

  const refund = await refundService.processRefund(
    id,
    req.user!.schoolId,
    refundMethod,
    bankDetails,
    transactionId
  );

  logger.info('Refund processed', { refundId: id });

  sendSuccess(res, 'Refund processed successfully', refund, 200);
});

export const getRefundById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const refund = await refundService.getRefundRequestById(id, req.user!.schoolId);

  if (!refund) {
    return sendError(res, 'Refund request not found', [], 404);
  }

  sendSuccess(res, 'Refund request retrieved successfully', refund, 200);
});

export const getRefunds = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, courseId } = req.query;

  const { page: p, limit: l } = getPaginationParams({ page, limit });

  const result = await refundService.getRefundRequests(
    p,
    l,
    req.user!.schoolId,
    status as any,
    courseId as string
  );

  sendSuccess(res, 'Refund requests retrieved successfully', result.refunds, 200, {
    ...getPaginationMeta(p, l, result.total),
  });
});

export const getRefundStats = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.query;

  const stats = await refundService.getRefundStats(req.user!.schoolId, courseId as string);

  sendSuccess(res, 'Refund statistics retrieved successfully', stats, 200);
});
