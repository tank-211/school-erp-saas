import prisma from '../config/database';
import {
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';

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
    totalAmount: number;
    dueDate: Date;
    approvedBy?: string;
    notes?: string;
  }) {
    const studentId = BigInt(data.studentId);
    const feeStructureId = BigInt(data.feeStructureId);

    if (data.totalAmount <= 0) {
      throw new ValidationError(
        'Total amount must be greater than 0'
      );
    }

    const [student, feeStructure] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, school_id: BigInt(data.schoolId) },
      }),

      prisma.fee_structure.findFirst({
        where: { id: feeStructureId, school_id: BigInt(data.schoolId) },
      }),
    ]);

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (!feeStructure) {
      throw new NotFoundError(
        'Fee structure not found'
      );
    }

    const invoiceNumber =
      await this.generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        school_id: student.school_id,
        student_id: student.id,
        invoice_number: invoiceNumber,
        invoice_date: new Date(),
        due_date: data.dueDate,
        total_amount: data.totalAmount,
        paid_amount: 0,
        pending_amount: data.totalAmount,
        status: 'unpaid',
        notes: data.notes,
        created_by: data.approvedBy,
      },

      include: {
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
    if (amount <= 0) {
      throw new ValidationError(
        'Payment amount must be greater than 0'
      );
    }

    const invoiceIdBigInt = BigInt(invoiceId);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceIdBigInt, school_id: BigInt(schoolId) },
    });

    if (!invoice) {
      throw new NotFoundError(
        'Invoice not found'
      );
    }

    const currentPaid = Number(
      invoice.paid_amount ?? 0
    );

    const currentPending = Number(
      invoice.pending_amount
    );

    if (currentPending <= 0) {
      throw new ValidationError(
        'This invoice is already fully paid'
      );
    }

    if (amount > currentPending) {
      throw new ValidationError(
        `Payment amount (₹${amount}) cannot exceed pending amount (₹${currentPending})`
      );
    }

    const newPaid = currentPaid + amount;
    const newPending = Math.max(
      0,
      Number(invoice.total_amount) - newPaid
    );

    const newStatus: PaymentStatus =
      newPending === 0
        ? 'paid'
        : newPaid > 0
          ? 'partial'
          : 'pending';

    const paymentNumber =
      await this.generatePaymentNumber();

    const result = await prisma.$transaction(
      async (tx) => {
        const payment =
          await tx.payment.create({
            data: {
              school_id: invoice.school_id,
              student_id: invoice.student_id,
              invoice_id: invoice.id,
              payment_number: paymentNumber,
              amount,
              payment_date: new Date(),
              payment_method: paymentMethod,
              transaction_id: transactionId,
              status: newStatus,
              remarks: notes,
            },
          });

        const updatedInvoice =
          await tx.invoice.update({
            where: {
              id: invoice.id,
            },
            data: {
              paid_amount: newPaid,
              pending_amount: newPending,
              status: newStatus,
              updated_at: new Date(),
            },
            include: {
              student: {
                select: {
                  id: true,
                  first_name: true,
                  middle_name: true,
                  last_name: true,
                  admission_number: true,
                },
              },
              payment: {
                orderBy: {
                  payment_date: 'desc',
                },
              },
            },
          });

        return {
          payment,
          invoice: updatedInvoice,
        };
      }
    );

    return {
      payment: this.serializePayment(
        result.payment
      ),
      invoice: this.serializeInvoice(
        result.invoice
      ),
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
  async getDashboardStats(courseId?: string) {
    /**
     * No course model exists in current schema.
     */
    void courseId;

    const [
      paymentTotals,
      paymentMethods,
      invoices,
    ] = await Promise.all([
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.payment.groupBy({
        by: ['payment_method'],
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.invoice.findMany({
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
    totalAmount: number;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    studentId?: string;
    feeStructureId?: string;
    dueDate?: Date;
    notes?: string;
  }) {
    if (data.totalAmount <= 0) {
      throw new ValidationError(
        'Total amount must be greater than 0'
      );
    }

    if (data.amountPaid < 0) {
      throw new ValidationError(
        'Amount paid cannot be negative'
      );
    }

    if (
      data.amountPaid >
      data.totalAmount
    ) {
      throw new ValidationError(
        `Amount paid (₹${data.amountPaid}) cannot exceed total amount (₹${data.totalAmount})`
      );
    }

    if (!data.studentId) {
      throw new ValidationError(
        'Student ID is required'
      );
    }

    const studentId = BigInt(
      data.studentId
    );

    const student =
      await prisma.student.findFirst({
        where: { id: studentId, school_id: BigInt(data.schoolId) },
      });

    if (!student) {
      throw new NotFoundError(
        'Student not found'
      );
    }

    const invoiceNumber =
      await this.generateInvoiceNumber();

    const pendingAmount =
      data.totalAmount - data.amountPaid;

    const status: PaymentStatus =
      data.amountPaid === 0
        ? 'unpaid'
        : data.amountPaid ===
            data.totalAmount
          ? 'paid'
          : 'partial';

    const result =
      await prisma.$transaction(
        async (tx) => {
          const invoice =
            await tx.invoice.create({
              data: {
                school_id: student.school_id,
                student_id: student.id,
                invoice_number:
                  invoiceNumber,
                invoice_date: new Date(),
                due_date:
                  data.dueDate ?? new Date(),
                total_amount:
                  data.totalAmount,
                paid_amount:
                  data.amountPaid,
                pending_amount:
                  pendingAmount,
                status,
                notes: data.notes,
              },
            });

          let payment = null;

          if (data.amountPaid > 0) {
            const paymentNumber =
              await this.generatePaymentNumber();

            payment =
              await tx.payment.create({
                data: {
                  school_id:
                    student.school_id,
                  student_id: student.id,
                  invoice_id:
                    invoice.id,
                  payment_number:
                    paymentNumber,
                  amount:
                    data.amountPaid,
                  payment_date:
                    new Date(),
                  payment_method:
                    data.paymentMethod,
                  status,
                  remarks:
                    data.notes,
                },
              });
          }

          return {
            invoice,
            payment,
          };
        }
      );

    return {
      invoice: this.serializeInvoice(
        result.invoice
      ),
      payment: result.payment
        ? this.serializePayment(
            result.payment
          )
        : null,
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
