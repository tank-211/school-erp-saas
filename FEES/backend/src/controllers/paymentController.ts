import { Request, Response } from 'express';
import { schoolPaymentStatus } from '../services/schoolRazorpay';
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

  const order = await paymentService.createRazorpayOrder(amount, currency || 'INR', _invoiceId, req.user!.schoolId);

  sendSuccess(res, 'Razorpay order created successfully', order, 200);
});

export const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendError(res, 'All Razorpay verification fields are required', [], 400);
  }

  // Verifies the signature, then records the payment on the order's invoice
  const verification = await paymentService.verifyRazorpayPayment(
    { razorpay_order_id, razorpay_payment_id, razorpay_signature },
    req.user!.schoolId,
    req.user?.id?.toString()
  );

  sendSuccess(res, 'Payment verified and recorded', verification, 200);
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


// Razorpay calls this (no login). Answers 2xx for handled and ignored events so
// Razorpay does not retry them; a bad signature or unknown school is refused.
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const result = await paymentService.handleRazorpayWebhook(
      String(req.params.schoolId),
      (req as any).rawBody,
      req.get('x-razorpay-signature') || undefined
    );
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(error?.status || 500).json({ success: false, message: error?.message || 'Webhook failed' });
  }
};

// Whether this school can take online payments (for the Pay page)
export const razorpayStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await schoolPaymentStatus(req.user!.schoolId);
  sendSuccess(res, 'Online payment status', status, 200);
});
