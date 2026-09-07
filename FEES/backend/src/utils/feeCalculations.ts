import { Decimal } from '@prisma/client/runtime/library';

export const calculatePaymentStatus = (
  amountPaid: number | Decimal,
  totalAmount: number | Decimal,
  dueDate: Date
) => {
  const paid = Number(amountPaid);
  const total = Number(totalAmount);

  if (paid >= total) {
    return 'PAID';
  }

  const now = new Date();
  if (now > dueDate && paid < total) {
    return 'OVERDUE';
  }

  if (paid > 0 && paid < total) {
    return 'PARTIAL';
  }

  return 'PENDING';
};

export const calculateOverduePenalty = (
  dueDate: Date,
  gracePeriodDays: number = 15,
  penaltyPerDay: number | Decimal = 0
) => {
  const now = new Date();
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

  if (now <= gracePeriodEnd) {
    return 0;
  }

  const daysOverdue = Math.floor(
    (now.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Number(penaltyPerDay) * daysOverdue;
};

export const calculatePendingAmount = (
  totalAmount: number | Decimal,
  amountPaid: number | Decimal,
  discountAmount: number | Decimal = 0
) => {
  const total = Number(totalAmount);
  const paid = Number(amountPaid);
  const discount = Number(discountAmount);

  return Math.max(0, total - paid - discount);
};

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCP-${Date.now()}-${random}`;
};

export const formatCurrency = (amount: number | Decimal, currency: string = 'INR'): string => {
  const numAmount = Number(amount);
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
};

export const calculateDaysOverdue = (dueDate: Date, gracePeriodDays: number = 0): number => {
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

  const now = new Date();
  if (now <= gracePeriodEnd) {
    return 0;
  }

  return Math.floor((now.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60 * 24));
};

export const isOverdue = (dueDate: Date, gracePeriodDays: number = 0): boolean => {
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
  return new Date() > gracePeriodEnd;
};
