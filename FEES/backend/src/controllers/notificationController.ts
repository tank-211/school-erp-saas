import { Request, Response } from 'express';
import notificationService from '../services/notificationService';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';

export const sendWhatsApp = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.body;

  if (!invoiceId) {
    return sendError(res, 'Invoice ID is required', [], 400);
  }

  const result = await notificationService.sendWhatsAppNotification(invoiceId, req.user!.schoolId);

  sendSuccess(res, 'WhatsApp notification sent successfully', result, 200);
});

export const sendSMS = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.body;

  if (!invoiceId) {
    return sendError(res, 'Invoice ID is required', [], 400);
  }

  const result = await notificationService.sendSMSNotification(invoiceId, req.user!.schoolId);

  sendSuccess(res, 'SMS notification sent successfully', result, 200);
});

export const sendBulkNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { channel, invoiceIds, message } = req.body;

  if (!channel || !invoiceIds || !Array.isArray(invoiceIds)) {
    return sendError(res, 'Channel and invoiceIds array are required', [], 400);
  }

  if (channel !== 'whatsapp' && channel !== 'sms') {
    return sendError(res, 'Channel must be either whatsapp or sms', [], 400);
  }

  const result = await notificationService.sendBulkNotification({
    schoolId: req.user!.schoolId,
    channel,
    invoiceIds,
    message,
  });

  sendSuccess(
    res,
    `Bulk ${channel} notification completed`,
    result,
    200
  );
});
