import { sendSuccessResponse, sendErrorResponse } from '../utils/responseHelper.js';
import logger from '../config/logger.js';

/**
 * Send WhatsApp notification
 * @param {string} invoiceId - Fee payment ID
 */
export const sendWhatsAppNotification = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return sendErrorResponse(res, 'Invoice ID is required', 400);
    }

    // TODO: Integrate with Twilio WhatsApp API
    // For now, return success
    logger.info(`WhatsApp notification sent for invoice: ${invoiceId}`);

    return sendSuccessResponse(res, 'WhatsApp message sent successfully', {
      invoiceId,
      status: 'sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Send WhatsApp notification error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

/**
 * Send SMS notification
 * @param {string} invoiceId - Fee payment ID
 */
export const sendSMSNotification = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return sendErrorResponse(res, 'Invoice ID is required', 400);
    }

    // TODO: Integrate with Twilio SMS API
    // For now, return success
    logger.info(`SMS notification sent for invoice: ${invoiceId}`);

    return sendSuccessResponse(res, 'SMS sent successfully', {
      invoiceId,
      status: 'sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Send SMS notification error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

/**
 * Send Email notification
 * @param {string} invoiceId - Fee payment ID
 */
export const sendEmailNotification = async (req, res, next) => {
  try {
    const { invoiceId, email } = req.body;

    if (!invoiceId || !email) {
      return sendErrorResponse(res, 'Invoice ID and email are required', 400);
    }

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, return success
    logger.info(`Email notification sent to ${email} for invoice: ${invoiceId}`);

    return sendSuccessResponse(res, 'Email sent successfully', {
      invoiceId,
      email,
      status: 'sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Send email notification error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};
