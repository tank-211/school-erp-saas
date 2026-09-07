import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

type RefundMethod = string;

export class RefundService {
  async createRefundRequest(data: {
    schoolId: string;
    studentId: string;
    feePaymentId: string;
    amount: number;
    reason: string;
    description?: string;
  }) {
    const studentId = BigInt(data.studentId);
    const paymentId = BigInt(data.feePaymentId);

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

    const paymentAmount = Number(payment.amount);

    // Validate refund amount
    if (data.amount <= 0 || data.amount > paymentAmount) {
      throw new ValidationError(
        `Refund amount must be between 0 and ${paymentAmount}`
      );
    }

    // Check existing active refund request
    const existing = await prisma.refund_request.findFirst({
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
    const refund = await prisma.refund_request.create({
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
    const id = BigInt(refundId);

    const refund = await prisma.refund_request.findFirst({
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

    const updated = await prisma.refund_request.update({
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
    const id = BigInt(refundId);

    const refund = await prisma.refund_request.findFirst({
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

    const updated = await prisma.refund_request.update({
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
    _refundMethod: RefundMethod,
    _bankDetails?: {
      accountHolder: string;
      accountNumber: string;
      ifscCode: string;
    },
    _transactionId?: string
  ) {
    const id = BigInt(refundId);

    const refund = await prisma.refund_request.findFirst({
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

    /*
     * The current Prisma schema does not contain dedicated fields for:
     * refund method
     * bank account holder
     * bank account number
     * IFSC
     * refund transaction ID
     *
     * Therefore these values cannot be persisted in refund_request
     * until the schema is extended.
     */

    const processed = await prisma.refund_request.update({
      where: {
        id,
      },
      data: {
        status: 'PROCESSED',
        processed_date: new Date(),
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

    return processed;
  }

  async getRefundRequestById(refundId: string, schoolId: string) {
    const id = BigInt(refundId);

    const refund = await prisma.refund_request.findFirst({
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
      prisma.refund_request.findMany({
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

      prisma.refund_request.count({
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
      prisma.refund_request.groupBy({
        by: ['status'],
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
        where,
      }),

      prisma.refund_request.aggregate({
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
      (s) => s.status === 'PROCESSED'
    );

    return {
      totalRequested: Number(
        totalRequested._sum.amount ?? 0
      ),

      totalCount: totalRequested._count._all,

      byStatus: stats.map((s) => ({
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
