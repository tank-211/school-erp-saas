import { Request, Response } from 'express';
import paymentService from '../services/paymentService';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';
type PaymentMethod =
  | 'cash'
  | 'online'
  | 'upi'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | string;
import logger from '../config/logger';

export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const { amount, invoiceId: _invoiceId, currency } = req.body;

  if (!amount || amount <= 0) {
    return sendError(res, 'Valid amount is required', [], 400);
  }

  const order = await paymentService.createRazorpayOrder(amount, currency || 'INR', _invoiceId);

  sendSuccess(res, 'Razorpay order created successfully', order, 200);
});

export const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, amount, paymentMethod } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendError(res, 'All Razorpay verification fields are required', [], 400);
  }

  const verification = await paymentService.verifyRazorpayPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  sendSuccess(res, 'Payment verified successfully', verification, 200);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const { amount, paymentMethod, transactionId, notes, razorpayOrderId, razorpayPaymentId } = req.body;

  if (!amount || amount <= 0) {
    return sendError(res, 'Valid amount is required', [], 400);
  }

  if (!paymentMethod) {
    return sendError(res, 'Payment method is required', [], 400);
  }

  const result = await paymentService.recordPayment(invoiceId, req.user!.schoolId, {
    amount,
    paymentMethod: paymentMethod as PaymentMethod,
    transactionId,
    notes,
    razorpayOrderId,
    razorpayPaymentId,
    receivedBy: req.user?.id?.toString(),
  });

  logger.info('Payment recorded via API', {
    invoiceId,
    paymentId: result.payment.id,
    amount,
  });

  sendSuccess(res, 'Payment recorded successfully', result, 200);
});

export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.params;

  const history = await paymentService.getPaymentHistory(invoiceId, req.user!.schoolId);

  sendSuccess(res, 'Payment history retrieved successfully', history, 200);
});
