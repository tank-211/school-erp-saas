import { RefundService } from '../services/refundService.js';
import { sendSuccessResponse, sendErrorResponse, createPaginatedResponse, getPaginationParams } from '../utils/responseHelper.js';
import logger from '../config/logger.js';

export const createRefundRequest = async (req, res, next) => {
  try {
    const { userId } = req.user;
    
    // Accept both invoiceId and feePaymentId
    const { invoiceId, feePaymentId, ...otherData } = req.validatedData;
    const paymentId = feePaymentId || invoiceId;

    if (!paymentId) {
      return sendErrorResponse(res, 'invoiceId or feePaymentId is required', 400);
    }

    const refundRequest = await RefundService.createRefundRequest({
      ...otherData,
      feePaymentId: paymentId
    }, userId);
    
    return sendSuccessResponse(res, 'Refund request created successfully', refundRequest, 201);
  } catch (error) {
    logger.error(`Create refund request error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const approveRefundRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const refundRequest = await RefundService.approveRefundRequest(id, {
      approvedBy: req.user.userId,
      notes
    });

    return sendSuccessResponse(res, 'Refund request approved successfully', refundRequest);
  } catch (error) {
    logger.error(`Approve refund request error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const rejectRefundRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return sendErrorResponse(res, 'Rejection reason is required', 400);
    }

    const refundRequest = await RefundService.rejectRefundRequest(id, {
      rejectionReason,
      approvedBy: req.user.userId
    });

    return sendSuccessResponse(res, 'Refund request rejected successfully', refundRequest);
  } catch (error) {
    logger.error(`Reject refund request error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const processRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    if (!transactionId) {
      return sendErrorResponse(res, 'Transaction ID is required', 400);
    }

    const refundRequest = await RefundService.processRefund(id, {
      transactionId
    });

    return sendSuccessResponse(res, 'Refund processed successfully', refundRequest);
  } catch (error) {
    logger.error(`Process refund error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getRefundRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, student } = req.query;

    const filters = {};
    if (status) {
      filters.status = status;
    }
    if (student) {
      filters.student = student;
    }

    const { skip, limit: paginationLimit } = getPaginationParams(page, limit);
    const { refunds, total } = await RefundService.getRefundRequests(filters, skip, paginationLimit);

    const response = createPaginatedResponse(refunds, total, parseInt(page), paginationLimit);
    return sendSuccessResponse(res, 'Refund requests retrieved successfully', response);
  } catch (error) {
    logger.error(`Get refund requests error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getRefundStats = async (req, res, next) => {
  try {
    const stats = await RefundService.getRefundStats();
    return sendSuccessResponse(res, 'Refund statistics retrieved successfully', stats);
  } catch (error) {
    logger.error(`Get refund stats error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};
