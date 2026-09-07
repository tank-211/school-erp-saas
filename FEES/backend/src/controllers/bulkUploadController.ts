import { Request, Response } from 'express';
import bulkUploadService from '../services/bulkUploadService';
import { sendSuccess, sendError, getPaginationParams, getPaginationMeta } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

export const uploadFeeStructures = asyncHandler(async (req: Request, res: Response) => {
  const fileBuffer = req.file?.buffer;
  const uploadedBy = req.user?.id;

  if (!fileBuffer) {
    return sendError(res, 'CSV file is required', [], 400);
  }

  const csvData = await bulkUploadService.parseCSV(fileBuffer);

  if (csvData.length === 0) {
    return sendError(res, 'CSV file is empty', [], 400);
  }

  const result = await bulkUploadService.uploadFeeStructures(csvData, uploadedBy || '', req.user!.schoolId);

  sendSuccess(res, 'Fee structures uploaded successfully', result, 201);
});

export const uploadInvoices = asyncHandler(async (req: Request, res: Response) => {
  const fileBuffer = req.file?.buffer;
  const uploadedBy = req.user?.id;

  if (!fileBuffer) {
    return sendError(res, 'CSV file is required', [], 400);
  }

  const csvData = await bulkUploadService.parseCSV(fileBuffer);

  if (csvData.length === 0) {
    return sendError(res, 'CSV file is empty', [], 400);
  }

  const result = await bulkUploadService.uploadInvoices(csvData, uploadedBy || '', req.user!.schoolId);

  sendSuccess(res, 'Invoices uploaded successfully', result, 201);
});

export const uploadPayments = asyncHandler(async (req: Request, res: Response) => {
  const fileBuffer = req.file?.buffer;
  const uploadedBy = req.user?.id;

  if (!fileBuffer) {
    return sendError(res, 'CSV file is required', [], 400);
  }

  const csvData = await bulkUploadService.parseCSV(fileBuffer);

  if (csvData.length === 0) {
    return sendError(res, 'CSV file is empty', [], 400);
  }

  const result = await bulkUploadService.uploadPayments(csvData, uploadedBy || '', req.user!.schoolId);

  sendSuccess(res, 'Payments uploaded successfully', result, 201);
});

export const uploadStudents = asyncHandler(async (req: Request, res: Response) => {
  const fileBuffer = req.file?.buffer;
  const uploadedBy = req.user?.id;

  if (!fileBuffer) {
    return sendError(res, 'CSV file is required', [], 400);
  }

  const csvData = await bulkUploadService.parseCSV(fileBuffer);

  if (csvData.length === 0) {
    return sendError(res, 'CSV file is empty', [], 400);
  }

  const result = await bulkUploadService.uploadStudents(csvData, uploadedBy || '', req.user!.schoolId);

  sendSuccess(res, 'Students uploaded successfully', result, 201);
});

export const getUploadLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query;

  const { page: p, limit: l } = getPaginationParams({ page, limit });

  const result = await bulkUploadService.getUploadLogs(p, l);

  sendSuccess(res, 'Upload logs retrieved successfully', result.logs, 200, {
    ...getPaginationMeta(p, l, result.total),
  });
});
