import { refundTable } from '../utils/refunds';
import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

type RefundStatRow = {
  status: string | null;
  _count: {
    _all: number;
  };
  _sum: {
    amount: unknown;
  };
};

// Ids arrive from URLs and forms: reject anything that is not a whole number
const toId = (value: unknown, what: string): bigint => {
  if (!/^\d+$/.test(String(value ?? ''))) {
    throw new ValidationError(`A valid ${what} id is required`);
  }
  return BigInt(String(value));
};

type RefundMethod = string;

// Method name of the negative payment entry written when a refund is paid.
// Collection totals include it (that is the point); charts by payment method skip it.
export const REFUND_PAYMENT_METHOD = 'refund';

// Money maths in whole paise, to avoid fraction errors
const toPaise = (value: unknown): number => Math.round(Number(value ?? 0) * 100);
const fromPaise = (paise: number): string => (paise / 100).toFixed(2);

// Today's date in India as a date-only value (payment_date is a DATE column)
const indiaToday = (): Date =>
  new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}T00:00:00.000Z`);

export class RefundService {
  async createRefundRequest(data: {
    schoolId: string;
    studentId: string;
    feePaymentId: string;
    amount: number;
    reason: string;
    description?: string;
  }) {
    const studentId = toId(data.studentId, 'student');
    const paymentId = toId(data.feePaymentId, 'payment');

    // Check student exists
    const schoolId = BigInt(data.schoolId);
    const student = await prisma.student.findFirst({
      where: { id: studentId, school_id: schoolId },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Check payment exists
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, school_id: schoolId },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Make sure payment belongs to the requested student
    if (payment.student_id !== studentId) {
      throw new ValidationError(
        'Payment does not belong to the specified student'
      );
    }

    if (payment.payment_method === REFUND_PAYMENT_METHOD || Number(payment.amount) <= 0) {
      throw new ValidationError('This entry is itself a refund and cannot be refunded');
    }

    // What is left of this payment after refunds already paid out
    const paidOut: Array<{ amount: unknown }> = await refundTable().findMany({
      where: { payment_id: paymentId, school_id: schoolId, status: 'PROCESSED' },
      select: { amount: true },
    });
    const refundablePaise =
      toPaise(payment.amount) -
      paidOut.reduce((sum: number, row: { amount: unknown }) => sum + toPaise(row.amount), 0);

    // Validate refund amount
    if (!(Number(data.amount) > 0) || toPaise(data.amount) > refundablePaise) {
      throw new ValidationError(
        refundablePaise <= 0
          ? 'This payment has already been refunded in full'
          : `Refund amount must be more than 0 and at most ${fromPaise(refundablePaise)}`
      );
    }

    // Check existing active refund request
    const existing = await refundTable().findFirst({
      where: {
        payment_id: paymentId,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
    });

    if (existing) {
      throw new ValidationError(
        'Refund already requested for this payment'
      );
    }

    // Create refund request
    const refund = await refundTable().create({
      data: {
        school_id: payment.school_id,
        student_id: studentId,
        payment_id: paymentId,
        amount: data.amount,
        reason: data.reason,
        description: data.description,
        status: 'PENDING',
      },
      include: {
        student: {
          select: {
            id: true,
            admission_number: true,
            first_name: true,
            last_name: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            payment_method: true,
            transaction_id: true,
            invoice: {
              select: {
                id: true,
                invoice_number: true,
                total_amount: true,
              },
            },
          },
        },
      },
    });

    return refund;
  }

  async approveRefundRequest(
    refundId: string,
    schoolId: string,
    approvedBy: string,
    notes?: string
  ) {
    const id = toId(refundId, 'refund request');

    const refund = await refundTable().findFirst({
      where: { id, school_id: BigInt(schoolId) },
    });

    if (!refund) {
      throw new NotFoundError('Refund request not found');
    }

    if (refund.status !== 'PENDING') {
      throw new ValidationError(
        `Only pending refunds can be approved. Current status: ${refund.status}`
      );
    }

    const updated = await refundTable().update({
      where: {
        id,
      },
      data: {
        status: 'APPROVED',
        approved_by: approvedBy,
        approval_date: new Date(),
        notes,
      },
      include: {
        student: {
          select: {
            id: true,
            admission_number: true,
            first_name: true,
            last_name: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            payment_method: true,
            transaction_id: true,
            invoice: {
              select: {
                id: true,
                invoice_number: true,
                total_amount: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  async rejectRefundRequest(
    refundId: string,
    schoolId: string,
    rejectionReason: string,
    approvedBy: string
  ) {
    const id = toId(refundId, 'refund request');

    const refund = await refundTable().findFirst({
      where: { id, school_id: BigInt(schoolId) },
    });

    if (!refund) {
      throw new NotFoundError('Refund request not found');
    }

    if (refund.status !== 'PENDING') {
      throw new ValidationError(
        `Only pending refunds can be rejected. Current status: ${refund.status}`
      );
    }

    const updated = await refundTable().update({
      where: {
        id,
      },
      data: {
        status: 'REJECTED',
        approved_by: approvedBy,
        approval_date: new Date(),
        rejection_reason: rejectionReason,
      },
    });

    return updated;
  }

  async processRefund(
    refundId: string,
    schoolId: string,
    refundMethod: RefundMethod,
    bankDetails?: {
      accountHolder: string;
      accountNumber: string;
      ifscCode: string;
    },
    transactionId?: string
  ) {
    const id = toId(refundId, 'refund request');

    const refund = await refundTable().findFirst({
      where: { id, school_id: BigInt(schoolId) },
    });

    if (!refund) {
      throw new NotFoundError('Refund request not found');
    }

    if (refund.status !== 'APPROVED') {
      throw new ValidationError(
        `Only approved refunds can be processed. Current status: ${refund.status}`
      );
    }

    const method = String(refundMethod || '').trim().toLowerCase();
    if (!method) {
      throw new ValidationError('Refund method is required');
    }
    const accountDigits = String(bankDetails?.accountNumber || '').replace(/\D/g, '');
    const sid = BigInt(schoolId);
    const reference = transactionId ? String(transactionId).trim().slice(0, 100) : null;

    // Paying a refund changes the books in one step: the refund is marked
    // processed, the invoice gets the amount back as balance due, and a
    // negative payment entry is recorded so every collection total drops by
    // the refunded amount. All or nothing.
    const processed = await prisma.$transaction(async (tx) => {
      const refunds = (tx as any).refund_request;

      const payment = await tx.payment.findFirst({
        where: { id: refund.payment_id, school_id: sid },
        select: { id: true, amount: true, payment_number: true, invoice_id: true, student_id: true },
      });
      if (!payment) {
        throw new NotFoundError('The payment this refund belongs to was not found');
      }

      // Never refund more than was paid, across all refunds of this payment
      const refundPaise = toPaise(refund.amount);
      const earlier: Array<{ amount: unknown }> = await refunds.findMany({
        where: { payment_id: payment.id, school_id: sid, status: 'PROCESSED' },
        select: { amount: true },
      });
      const alreadyRefundedPaise = earlier.reduce(
        (sum: number, row: { amount: unknown }) => sum + toPaise(row.amount),
        0
      );
      const paymentPaise = toPaise(payment.amount);
      if (refundPaise <= 0 || alreadyRefundedPaise + refundPaise > paymentPaise) {
        throw new ValidationError(
          `This payment was ${fromPaise(paymentPaise)} and ${fromPaise(alreadyRefundedPaise)} of it has already been refunded, so ${fromPaise(refundPaise)} more cannot be refunded.`
        );
      }

      const invoice = await tx.invoice.findFirst({
        where: { id: payment.invoice_id, school_id: sid },
        select: { id: true, total_amount: true, paid_amount: true },
      });
      if (!invoice) {
        throw new NotFoundError('The invoice this refund belongs to was not found');
      }

      // Only one request may win if two people press Process at once
      const claimed = await refunds.updateMany({
        where: { id, school_id: sid, status: 'APPROVED' },
        data: {
          status: 'PROCESSED',
          processed_date: new Date(),
          refund_method: method.slice(0, 50),
          refund_reference: reference,
          account_holder: bankDetails?.accountHolder ? String(bankDetails.accountHolder).trim().slice(0, 150) : null,
          // Only the last 4 digits are kept: enough to identify the account, not to use it
          account_last4: accountDigits ? accountDigits.slice(-4) : null,
          ifsc_code: bankDetails?.ifscCode ? String(bankDetails.ifscCode).trim().toUpperCase().slice(0, 20) : null,
        },
      });
      if (claimed.count !== 1) {
        throw new ValidationError('This refund has already been processed.');
      }

      // The invoice is owed the refunded amount again
      const totalPaise = toPaise(invoice.total_amount);
      const paidPaise = Math.max(toPaise(invoice.paid_amount) - refundPaise, 0);
      const pendingPaise = Math.max(totalPaise - paidPaise, 0);
      const invoiceStatus = paidPaise <= 0 ? 'unpaid' : pendingPaise <= 0 ? 'paid' : 'partial';
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paid_amount: fromPaise(paidPaise),
          pending_amount: fromPaise(pendingPaise),
          status: invoiceStatus,
          updated_at: new Date(),
        },
      });

      // Negative entry dated today (India): collections are totals of payment
      // rows, so this is what reduces them, in the month the money went back.
      await tx.payment.create({
        data: {
          school_id: sid,
          student_id: payment.student_id,
          invoice_id: invoice.id,
          payment_number: `RFD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          amount: fromPaise(-refundPaise),
          payment_date: indiaToday(),
          payment_method: REFUND_PAYMENT_METHOD,
          transaction_id: reference || undefined,
          status: 'refunded',
          remarks: `Refund of payment ${payment.payment_number} (refund request ${id.toString()}), paid by ${method}`.slice(0, 500),
        },
      });

      return refunds.findFirst({
        where: { id, school_id: sid },
        include: {
          student: {
            select: {
              id: true,
              admission_number: true,
              first_name: true,
              last_name: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              payment_method: true,
              transaction_id: true,
              invoice: {
                select: {
                  id: true,
                  invoice_number: true,
                  total_amount: true,
                  paid_amount: true,
                  pending_amount: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    }, { maxWait: 10000, timeout: 30000 });

    return processed;
  }

  async getRefundRequestById(refundId: string, schoolId: string) {
    const id = toId(refundId, 'refund request');

    const refund = await refundTable().findFirst({
      where: { id, school_id: BigInt(schoolId) },
      include: {
        student: {
          select: {
            id: true,
            admission_number: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            payment_method: true,
            transaction_id: true,
            payment_date: true,
            status: true,
            invoice: {
              select: {
                id: true,
                invoice_number: true,
                invoice_date: true,
                due_date: true,
                total_amount: true,
                paid_amount: true,
                pending_amount: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundError('Refund request not found');
    }

    return refund;
  }

  async getRefundRequests(
    page: number = 1,
    limit: number = 10,
    schoolId: string,
    status?: RefundStatus,
    courseId?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = { school_id: BigInt(schoolId) };

    if (status) {
      where.status = status;
    }

    /*
     * courseId cannot currently be filtered directly through
     * refund_request.
     *
     * The current schema does not expose a direct course relation
     * from payment/invoice to refund_request.
     */
    void courseId;

    const [refunds, total] = await Promise.all([
      refundTable().findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              admission_number: true,
              first_name: true,
              last_name: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              payment_method: true,
              transaction_id: true,
              invoice: {
                select: {
                  id: true,
                  invoice_number: true,
                  total_amount: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),

      refundTable().count({
        where,
      }),
    ]);

    return {
      refunds,
      total,
      page,
      limit,
    };
  }

  async getRefundStats(schoolId: string, courseId?: string) {
    const where: any = { school_id: BigInt(schoolId) };

    /*
     * courseId is currently unsupported because the refund_request
     * schema has no direct course relationship.
     */
    void courseId;

    const [stats, totalRequested] = await Promise.all([
      refundTable().groupBy({
        by: ['status'],
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
        where,
      }),

      refundTable().aggregate({
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
        where,
      }),
    ]);

    const processed = stats.find(
      (s: RefundStatRow) => s.status === 'PROCESSED'

    );

    return {
      totalRequested: Number(
        totalRequested._sum.amount ?? 0
      ),

      totalCount: totalRequested._count._all,

      byStatus: stats.map((s: RefundStatRow) => ({
        status: s.status,
        count: s._count._all,
        amount: Number(s._sum.amount ?? 0),
      })),

      /*
       * refund_method does not exist in the current schema.
       */
      byMethod: [],

      processedAmount: Number(
        processed?._sum.amount ?? 0
      ),
    };
  }
}

export default new RefundService();
