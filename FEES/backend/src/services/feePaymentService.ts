import prisma from '../config/database';
import {
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import { resolveStudentFeeAmount } from './feeAmountResolver';
import { recordPaymentAtomically } from './paymentLedger';

type PaymentMethod =
  | 'cash'
  | 'online'
  | 'upi'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | string;

type PaymentStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | string;

export class FeePaymentService {
  /**
   * Create an invoice / fee payment obligation for a student.
   *
   * Current schema:
   * student
   * fee_structure
   * invoice
   */
  async createFeePayment(data: {
    schoolId: string;
    studentId: string;
    feeStructureId: string;
    totalAmount: number; // retained for API compatibility; never trusted
    dueDate: Date;
    approvedBy?: string;
    notes?: string;
  }) {
    const studentId = BigInt(data.studentId);
    const student = await prisma.student.findFirst({
      where: { id: studentId, school_id: BigInt(data.schoolId) },
    });
    if (!student) throw new NotFoundError('Student not found');

    const configuredFee = await resolveStudentFeeAmount(
      prisma, data.schoolId, data.studentId, data.feeStructureId
    );
    const invoice = await prisma.invoice.create({
      data: {
        school_id: student.school_id,
        student_id: student.id,
        invoice_number: await this.generateInvoiceNumber(),
        invoice_date: new Date(),
        due_date: data.dueDate || configuredFee.dueDate || new Date(),
        total_amount: configuredFee.amount,
        paid_amount: 0,
        pending_amount: configuredFee.amount,
        status: 'unpaid',
        notes: data.notes || `Fee: ${configuredFee.feeType}`,
        created_by: data.approvedBy,
      },
      include: {
        student: {
          select: {
            id: true, first_name: true, middle_name: true,
            last_name: true, admission_number: true,
          },
        },
      },
    });
    return this.serializeInvoice(invoice);
  }

  /**
   * Record an actual payment against an invoice.
   */
  async recordPayment(
    invoiceId: string,
    schoolId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    transactionId?: string,
    notes?: string
  ) {
    const result = await recordPaymentAtomically(prisma, {
      invoiceId,
      schoolId,
      amount,
      paymentMethod,
      transactionId,
      notes,
      paymentNumber: await this.generatePaymentNumber(),
    });
    return {
      payment: this.serializePayment(result.payment),
      invoice: this.serializeInvoice(result.invoice),
    };
  }

  /**
   * Get pending invoices.
   */
  async getPendingPayments(
    page: number = 1,
    limit: number = 10,
    schoolId: string,
    courseId?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      school_id: BigInt(schoolId),
      pending_amount: {
        gt: 0,
      },
      status: {
        in: ['unpaid', 'partial', 'pending'],
      },
    };

    /**
     * There is no course model in the current schema.
     *
     * courseId is therefore intentionally not applied.
     */
    void courseId;

    const [invoices, total] =
      await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            student: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                admission_number: true,
                city: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          skip,
          take: limit,
        }),

        prisma.invoice.count({
          where,
        }),
      ]);

    return {
      payments: invoices.map((invoice) =>
        this.serializeInvoice(invoice)
      ),
      total,
      page,
      limit,
    };
  }

  /**
   * Get overdue invoices.
   */
  async getOverduePayments(
    page: number = 1,
    limit: number = 10,
    schoolId: string,
    courseId?: string
  ) {
    const skip = (page - 1) * limit;

    /**
     * No course model exists in the current schema.
     */
    void courseId;

    const where: any = {
      school_id: BigInt(schoolId),
      due_date: {
        lt: new Date(),
      },
      pending_amount: {
        gt: 0,
      },
    };

    const [invoices, total] =
      await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            student: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                admission_number: true,
                city: true,
              },
            },
          },
          orderBy: {
            due_date: 'asc',
          },
          skip,
          take: limit,
        }),

        prisma.invoice.count({
          where,
        }),
      ]);

    const payments = invoices.map(
      (invoice) => {
        const daysOverdue =
          this.calculateDaysOverdue(
            invoice.due_date
          );

        return {
          ...this.serializeInvoice(invoice),
          daysOverdue,
          estimatedPenalty: 0,
        };
      }
    );

    return {
      payments,
      total,
      page,
      limit,
    };
  }

  /**
   * Dashboard fee statistics.
   */
  async getDashboardStats(schoolId: string, courseId?: string) {
    /**
     * No course model exists in current schema.
     */
    void courseId;
    const sid = BigInt(schoolId);

    const [
      paymentTotals,
      paymentMethods,
      invoices,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { school_id: sid },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.payment.groupBy({
        by: ['payment_method'],
        // Refund entries are negative: not a payment method
        where: { school_id: sid, payment_method: { not: 'refund' } },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.invoice.findMany({
        where: { school_id: sid },
        select: {
          total_amount: true,
          paid_amount: true,
          pending_amount: true,
          due_date: true,
          status: true,
        },
      }),
    ]);

    let totalFees = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    for (const invoice of invoices) {
      const totalAmount = Number(
        invoice.total_amount
      );

      const pendingAmount = Number(
        invoice.pending_amount
      );

      totalFees += totalAmount;

      if (pendingAmount > 0) {
        totalPending += pendingAmount;
      }

      if (
        pendingAmount > 0 &&
        invoice.due_date < new Date()
      ) {
        totalOverdue += pendingAmount;
      }
    }

    const totalCollected = Number(
      paymentTotals._sum.amount ?? 0
    );

    return {
      overallStats: {
        totalFees,
        totalCollected,
        totalPending,
        totalOverdue,
        totalRecords:
          paymentTotals._count._all,
      },

      byStatus: [
        {
          status: 'PAID',
          totalAmount: totalCollected,
          amountCollected: totalCollected,
        },
        {
          status: 'PENDING',
          totalAmount: totalPending,
          amountCollected: 0,
        },
        {
          status: 'OVERDUE',
          totalAmount: totalOverdue,
          amountCollected: 0,
        },
      ],

      byPaymentMethod:
        paymentMethods.map((item) => ({
          method: item.payment_method,
          count: item._count._all,
          totalAmount: Number(
            item._sum.amount ?? 0
          ),
        })),
    };
  }

  /**
   * Get collection data for last 12 months.
   */
  async getMonthlyCollectionData(
    schoolId: string,
    courseId?: string
  ) {
    /**
     * No course model exists in current schema.
     */
    void courseId;

    const last12Months: {
      year: number;
      month: number;
    }[] = [];

    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        1
      );

      last12Months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      });
    }

    const startDate = new Date(
      last12Months[0].year,
      last12Months[0].month - 1,
      1
    );

    const payments =
      await prisma.payment.findMany({
        where: {
          school_id: BigInt(schoolId),
          payment_date: {
            gte: startDate,
          },
        },
        select: {
          amount: true,
          payment_date: true,
        },
        orderBy: {
          payment_date: 'asc',
        },
      });

    return last12Months.map((month) => {
      const monthPayments =
        payments.filter((payment) => {
          const date = new Date(
            payment.payment_date
          );

          return (
            date.getFullYear() === month.year &&
            date.getMonth() + 1 ===
              month.month
          );
        });

      const totalCollected =
        monthPayments.reduce(
          (sum, payment) =>
            sum + Number(payment.amount),
          0
        );

      return {
        month: `${month.year}-${String(
          month.month
        ).padStart(2, '0')}`,
        totalCollected,
        transactionCount:
          monthPayments.length,
      };
    });
  }

  /**
   * Get fee/payment history for a student.
   */
  async getFeePaymentHistory(
    studentId: string,
    schoolId: string
  ) {
    const id = BigInt(studentId);

    const invoices =
      await prisma.invoice.findMany({
        where: {
          student_id: id,
          school_id: BigInt(schoolId),
        },
        include: {
          payment: {
            orderBy: {
              payment_date: 'desc',
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

    return invoices.map((invoice) => ({
      ...this.serializeInvoice(invoice),
      payments: invoice.payment.map(
        (payment) =>
          this.serializePayment(payment)
      ),
    }));
  }

  /**
   * Submit fee payment from frontend.
   *
   * This method creates an invoice and, if
   * amountPaid > 0, records a payment transaction.
   */
  async submitFeePayment(data: {
    schoolId: string;
    totalAmount: number; // retained for API compatibility; never trusted
    amountPaid: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    studentId?: string;
    feeStructureId?: string;
    dueDate?: Date;
    notes?: string;
  }) {
    if (!data.studentId) throw new ValidationError('Student ID is required');
    if (!data.feeStructureId) {
      throw new ValidationError('Fee structure is required; invoice totals are calculated from the school fee configuration');
    }
    const amountPaidPaise = Math.round(Number(data.amountPaid) * 100);
    if (!Number.isFinite(Number(data.amountPaid)) || amountPaidPaise < 0) {
      throw new ValidationError('Amount paid must be a valid non-negative amount');
    }

    const student = await prisma.student.findFirst({
      where: { id: BigInt(data.studentId), school_id: BigInt(data.schoolId) },
    });
    if (!student) throw new NotFoundError('Student not found');

    const configuredFee = await resolveStudentFeeAmount(
      prisma, data.schoolId, data.studentId, data.feeStructureId
    );
    const totalPaise = Math.round(configuredFee.amount * 100);
    if (amountPaidPaise > totalPaise) {
      throw new ValidationError(`Amount paid cannot exceed the configured fee of ₹${configuredFee.amount.toFixed(2)}`);
    }

    const pendingAmount = (totalPaise - amountPaidPaise) / 100;
    const status: PaymentStatus = amountPaidPaise === 0
      ? 'unpaid'
      : amountPaidPaise === totalPaise ? 'paid' : 'partial';

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          school_id: student.school_id,
          student_id: student.id,
          invoice_number: await this.generateInvoiceNumber(),
          invoice_date: new Date(),
          due_date: data.dueDate || configuredFee.dueDate || new Date(),
          total_amount: configuredFee.amount,
          paid_amount: amountPaidPaise / 100,
          pending_amount: pendingAmount,
          status,
          notes: data.notes || `Fee: ${configuredFee.feeType}`,
        },
      });

      let payment = null;
      if (amountPaidPaise > 0) {
        payment = await tx.payment.create({
          data: {
            school_id: student.school_id,
            student_id: student.id,
            invoice_id: invoice.id,
            payment_number: await this.generatePaymentNumber(),
            amount: amountPaidPaise / 100,
            payment_date: new Date(),
            payment_method: data.paymentMethod,
            status,
            remarks: data.notes,
          },
        });
      }
      return { invoice, payment };
    });

    return {
      invoice: this.serializeInvoice(result.invoice),
      payment: result.payment ? this.serializePayment(result.payment) : null,
    };
  }

  /**
   * Get recent payment transactions.
   */
  async getRecentTransactions(
    schoolId: string,
    courseId?: string,
    limit: number = 5
  ) {
    /**
     * No course model exists in current schema.
     */
    void courseId;

    const payments =
      await prisma.payment.findMany({
        where: { school_id: BigInt(schoolId) },
        take: limit,
        orderBy: {
          payment_date: 'desc',
        },
        select: {
          id: true,
          amount: true,
          payment_date: true,
          payment_method: true,
          transaction_id: true,
          student_id: true,
          invoice_id: true,

          invoice: {
            select: {
              invoice_number: true,
              total_amount: true,
              paid_amount: true,
              pending_amount: true,
              due_date: true,
              status: true,
            },
          },

          student: {
            select: {
              id: true,
              first_name: true,
              middle_name: true,
              last_name: true,
              admission_number: true,
            },
          },
        },
      });

    return payments.map((payment) => ({
      id: payment.id.toString(),

        invoiceId:
          payment.invoice_id.toString(),

      studentId:
        payment.student_id.toString(),

      studentName: [
        payment.student?.first_name ?? '',
        payment.student?.middle_name ?? '',
        payment.student?.last_name ?? '',
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Unknown',

      totalAmount: Number(
        payment.invoice?.total_amount ??
          payment.amount
      ),

      amountPaid: Number(
        payment.invoice?.paid_amount ??
          payment.amount
      ),

      amountPending: Number(
        payment.invoice?.pending_amount ?? 0
      ),

      paymentStatus:
        payment.invoice?.status ?? 'paid',

      dueDate: payment.invoice?.due_date
        ? payment.invoice.due_date.toISOString()
        : null,

      createdAt: payment.payment_date
        ? payment.payment_date.toISOString()
        : null,

      lastPaymentDate: payment.payment_date
        ? payment.payment_date.toISOString()
        : null,

      lastPaymentAmount:
        Number(payment.amount),

      paymentMethod:
        payment.payment_method,

      transactionId:
        payment.transaction_id,

      invoiceNumber:
        payment.invoice?.invoice_number ??
        null,
    }));
  }

  /**
   * Generate a unique invoice number.
   */
  private async generateInvoiceNumber() {
    const timestamp = Date.now();

    return `INV-${timestamp}`;
  }

  /**
   * Generate a unique payment number.
   */
  private async generatePaymentNumber() {
    const timestamp = Date.now();

    return `PAY-${timestamp}`;
  }

  /**
   * Calculate days overdue.
   */
  private calculateDaysOverdue(
    dueDate: Date
  ) {
    const now = new Date();

    const difference =
      now.getTime() - dueDate.getTime();

    return Math.max(
      0,
      Math.floor(
        difference /
          (1000 * 60 * 60 * 24)
      )
    );
  }

  /**
   * Convert BigInt values to strings
   * before sending them to frontend.
   */
  private serializeInvoice(invoice: any) {
    return {
      ...invoice,

      id: invoice.id?.toString?.() ?? invoice.id,

      school_id:
        invoice.school_id?.toString?.() ??
        invoice.school_id,

      student_id:
        invoice.student_id?.toString?.() ??
        invoice.student_id,

      total_amount:
        Number(invoice.total_amount ?? 0),

      paid_amount:
        Number(invoice.paid_amount ?? 0),

      pending_amount:
        Number(invoice.pending_amount ?? 0),

      student: invoice.student
        ? {
            ...invoice.student,

            id:
              invoice.student.id?.toString?.() ??
              invoice.student.id,
          }
        : invoice.student,
    };
  }

  private serializePayment(
    payment: any
  ) {
    return {
      ...payment,
      id: payment.id.toString(),
      school_id:
        payment.school_id?.toString?.() ??
        payment.school_id,
      student_id:
        payment.student_id.toString(),
      invoice_id:
        payment.invoice_id.toString(),
      amount: Number(payment.amount),
    };
  }
}

export default new FeePaymentService();
