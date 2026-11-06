import { NotFoundError, ValidationError } from '../middleware/errorHandler';

type RecordPaymentInput = {
  invoiceId: string;
  schoolId: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  receivedBy?: string;
  paymentNumber: string;
};

/**
 * Serializes all writes to one invoice with a PostgreSQL row lock. The balance
 * is recalculated only after acquiring that lock, so concurrent requests on
 * separate API instances cannot both spend the same outstanding balance.
 */
export async function recordPaymentAtomically(prisma: any, input: RecordPaymentInput) {
  if (!/^\d+$/.test(String(input.invoiceId)) || !/^\d+$/.test(String(input.schoolId))) {
    throw new ValidationError('A valid invoice and school are required');
  }
  const amountPaise = Math.round(Number(input.amount) * 100);
  if (!Number.isFinite(Number(input.amount)) || amountPaise <= 0) {
    throw new ValidationError('Payment amount must be greater than zero');
  }
  const transactionId = String(input.transactionId || '').trim() || undefined;
  const invoiceId = BigInt(input.invoiceId);
  const schoolId = BigInt(input.schoolId);

  return prisma.$transaction(async (tx: any) => {
    const locked = await tx.$queryRaw<Array<{ id: bigint }>>`
      SELECT id FROM invoice
      WHERE id = ${invoiceId} AND school_id = ${schoolId}
      FOR UPDATE
    `;
    if (!locked.length) throw new NotFoundError('Invoice not found');

    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, school_id: schoolId },
      include: {
        student: {
          select: { id: true, admission_number: true, first_name: true, last_name: true },
        },
        payment: {
          select: { id: true, amount: true, status: true },
        },
      },
    });
    if (!invoice) throw new NotFoundError('Invoice not found');

    if (transactionId) {
      const duplicate = await tx.payment.findFirst({
        where: { school_id: schoolId, transaction_id: transactionId },
        select: {
          id: true, invoice_id: true, payment_number: true, amount: true,
          payment_date: true, payment_method: true, transaction_id: true, status: true, remarks: true,
        },
      });
      if (duplicate) {
        if (duplicate.invoice_id !== invoice.id) {
          throw new ValidationError('This transaction ID is already linked to a different invoice');
        }
        return { payment: duplicate, invoice };
      }
    }

    const totalPaise = Math.round(Number(invoice.total_amount) * 100);
    const ledgerPaidPaise = invoice.payment.reduce((sum: number, payment: any) => {
      if (String(payment.status || '').toLowerCase() === 'cancelled') return sum;
      return sum + Math.round(Number(payment.amount) * 100);
    }, 0);
    // Preserve migrated/imported paid balances that predate payment ledger rows.
    const paidPaise = invoice.payment.length > 0
      ? ledgerPaidPaise
      : Math.round(Number(invoice.paid_amount ?? 0) * 100);
    const pendingPaise = Math.max(0, totalPaise - paidPaise);
    if (pendingPaise <= 0) throw new ValidationError('This invoice is already fully paid');
    if (amountPaise > pendingPaise) {
      throw new ValidationError(`Payment amount cannot exceed pending amount of ${(pendingPaise / 100).toFixed(2)}`);
    }

    const newPaidPaise = paidPaise + amountPaise;
    const newPendingPaise = Math.max(0, totalPaise - newPaidPaise);
    const status = newPendingPaise === 0 ? 'paid' : 'partial';

    const payment = await tx.payment.create({
      data: {
        school_id: invoice.school_id,
        student_id: invoice.student_id,
        invoice_id: invoice.id,
        payment_number: input.paymentNumber,
        amount: amountPaise / 100,
        payment_date: new Date(),
        payment_method: String(input.paymentMethod).trim().toLowerCase(),
        transaction_id: transactionId,
        status,
        remarks: input.notes,
        received_by: input.receivedBy,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paid_amount: newPaidPaise / 100,
        pending_amount: newPendingPaise / 100,
        status,
        updated_at: new Date(),
      },
      include: {
        student: {
          select: { id: true, admission_number: true, first_name: true, last_name: true },
        },
        payment: {
          select: {
            id: true, amount: true, payment_method: true, transaction_id: true,
            payment_date: true, status: true, remarks: true,
          },
          orderBy: { payment_date: 'desc' },
        },
      },
    });

    return { payment, invoice: updatedInvoice };
  });
}
