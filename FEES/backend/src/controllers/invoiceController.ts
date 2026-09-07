import { Request, Response } from 'express';
import invoiceService from '../services/invoiceService';
import { sendSuccess, sendError, getPaginationParams, getPaginationMeta } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.params;

  const invoice = await invoiceService.getInvoiceById(invoiceId, req.user!.schoolId);

  logger.info('Invoice retrieved', { invoiceId });

  sendSuccess(res, 'Invoice retrieved successfully', invoice, 200);
});

export const getAllInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, studentId, courseId } = req.query;

  const { page: p, limit: l } = getPaginationParams({ page, limit });

  const result = await invoiceService.getAllInvoices(p, l, {
    status: status as string,
    studentId: studentId as string,
    courseId: courseId as string,
  }, req.user!.schoolId);

  sendSuccess(res, 'Invoices retrieved successfully', result.invoices, 200, {
    ...getPaginationMeta(p, l, result.total),
  });
});

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, feeStructureId, totalAmount, dueDate, notes } = req.body;
  const approvedBy = req.user?.id;

  const invoice = await invoiceService.createInvoice({
    schoolId: req.user!.schoolId,
    studentId,
    feeStructureId,
    totalAmount,
    dueDate: new Date(dueDate),
    approvedBy,
    notes,
  });

  logger.info('Invoice created', { invoiceId: invoice.id, studentId });

  sendSuccess(res, 'Invoice created successfully', invoice, 201);
});

export const bulkCreateInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { invoices } = req.body;
  const approvedBy = req.user?.id;

  if (!Array.isArray(invoices) || invoices.length === 0) {
    return sendError(res, 'Invoices array is required', [], 400);
  }

  const result = await invoiceService.bulkCreateInvoices(
    invoices.map((inv: any) => ({
      ...inv,
      approvedBy,
    })),
    req.user!.schoolId
  );

  logger.info('Bulk invoices created', {
    success: result.success,
    failed: result.failed,
  });

  sendSuccess(
    res,
    `Bulk invoice creation completed. ${result.success} succeeded, ${result.failed} failed.`,
    result,
    201
  );
});

export const getReceiptData = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.params;

  const invoice = await invoiceService.getInvoiceById(invoiceId, req.user!.schoolId);

  const recentPayment = invoice.payments[0];

  if (!recentPayment) {
    return sendError(res, 'No payment found for this invoice', [], 404);
  }

  const receiptData = {
    invoiceId: invoice.invoiceId,
    invoiceDate: invoice.invoiceDate,
    studentName: invoice.studentName,
    rollNumber: invoice.rollNumber,
    parentName: invoice.parentName,
    email: invoice.email,
    phone: invoice.phone,

    paymentMethod: recentPayment.paymentMethod,
    transactionId:
      recentPayment.transactionId || recentPayment.id,

    paymentDate: invoice.paymentDate,

    totalAmount: invoice.totalAmount,
    amountPaid: Number(recentPayment.amount),

    status: 'PAID',
  };

  sendSuccess(
    res,
    'Receipt data retrieved successfully',
    receiptData,
    200
  );
});
