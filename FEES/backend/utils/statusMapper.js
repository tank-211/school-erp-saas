/**
 * Status Mapping Utility
 * Converts between database status values and display status values
 */

export const paymentStatusMap = {
  PAID: 'Paid',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
  PARTIAL: 'Partially Paid',
  CANCELLED: 'Cancelled'
};

export const refundStatusMap = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PROCESSED: 'Processed'
};

export const paymentMethodMap = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  ONLINE: 'Online',
  DD: 'Demand Draft',
  UPI: 'UPI',
  CARD: 'Card'
};

/**
 * Convert database payment status to display status
 */
export const getDisplayPaymentStatus = (dbStatus) => {
  return paymentStatusMap[dbStatus] || dbStatus;
};

/**
 * Convert display payment status to database status
 */
export const getDbPaymentStatus = (displayStatus) => {
  const reverse = Object.fromEntries(
    Object.entries(paymentStatusMap).map(([k, v]) => [v, k])
  );
  return reverse[displayStatus] || displayStatus;
};

/**
 * Convert database refund status to display status
 */
export const getDisplayRefundStatus = (dbStatus) => {
  return refundStatusMap[dbStatus] || dbStatus;
};

/**
 * Convert display refund status to database status
 */
export const getDbRefundStatus = (displayStatus) => {
  const reverse = Object.fromEntries(
    Object.entries(refundStatusMap).map(([k, v]) => [v, k])
  );
  return reverse[displayStatus] || displayStatus;
};

/**
 * Convert database payment method to display format
 */
export const getDisplayPaymentMethod = (dbMethod) => {
  return paymentMethodMap[dbMethod] || dbMethod;
};

/**
 * Convert display payment method to database format
 */
export const getDbPaymentMethod = (displayMethod) => {
  const reverse = Object.fromEntries(
    Object.entries(paymentMethodMap).map(([k, v]) => [v, k])
  );
  return reverse[displayMethod] || displayMethod;
};

/**
 * Transform fee payment response to include display values
 */
export const transformFeePaymentResponse = (feePayment) => {
  if (!feePayment) return null;

  return {
    ...feePayment,
    paymentStatus: getDisplayPaymentStatus(feePayment.paymentStatus),
    paymentMethod: feePayment.paymentMethod ? getDisplayPaymentMethod(feePayment.paymentMethod) : null,
    studentName: feePayment.student 
      ? `${feePayment.student.firstName} ${feePayment.student.lastName}`
      : 'N/A',
    invoiceId: feePayment.id
  };
};

/**
 * Transform fee payment array response
 */
export const transformFeePaymentsResponse = (feePayments) => {
  if (!Array.isArray(feePayments)) return feePayments;
  return feePayments.map(transformFeePaymentResponse);
};

/**
 * Transform refund response to include display values
 */
export const transformRefundResponse = (refund) => {
  if (!refund) return null;

  return {
    ...refund,
    status: getDisplayRefundStatus(refund.status),
    refundMethod: refund.refundMethod ? getDisplayPaymentMethod(refund.refundMethod) : null,
    studentName: refund.student
      ? `${refund.student.firstName} ${refund.student.lastName}`
      : 'N/A'
  };
};

/**
 * Transform refund array response
 */
export const transformRefundsResponse = (refunds) => {
  if (!Array.isArray(refunds)) return refunds;
  return refunds.map(transformRefundResponse);
};
