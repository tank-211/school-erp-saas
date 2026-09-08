import prisma from '../config/database';
import logger from '../config/logger';

/**
 * Report Service
 * Handles fetching and preparing data for various reports
 */

export const getDashboardStats = async (schoolId: string) => {
  try {
    // Total fees collected from all payments in the last year
    const totalFeesCollected = await prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        school_id: BigInt(schoolId),
        created_at: {
          gte: new Date(
            new Date().setFullYear(new Date().getFullYear() - 1)
          ),
        },
      },
    });

    // Pending invoice amounts
    const pendingPayments = await prisma.invoice.aggregate({
      _sum: {
        pending_amount: true,
      },
      where: {
        status: {
          in: ['unpaid', 'partial', 'overdue'],
        },
        pending_amount: {
          gt: 0,
        },
      },
    });

    // Overdue invoice amounts
    const overduePayments = await prisma.invoice.aggregate({
      _sum: {
        pending_amount: true,
      },
      where: {
        school_id: BigInt(schoolId),
        due_date: {
          lt: new Date(),
        },
        pending_amount: {
          gt: 0,
        },
      },
    });

    return {
      totalFeesCollected: Number(totalFeesCollected._sum.amount ?? 0),
      pendingPayments: Number(pendingPayments._sum.pending_amount ?? 0),
      overduePayments: Number(overduePayments._sum.pending_amount ?? 0),
    };
  } catch (error: any) {
    logger.error(`Get dashboard stats error: ${error.message}`);
    throw error;
  }
};

export const getMonthlyCollectionTrends = async (schoolId: string) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        school_id: BigInt(schoolId),
        created_at: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
      select: {
        created_at: true,
        amount: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
    // Aggregate by month
    const monthlyData = new Map<
      number,
      {
        month: string;
        amount: number;
        count: number;
      }
    >();

    payments.forEach((payment) => {
      const date = payment.created_at ?? new Date();
      const month = date.getMonth();

      const monthName = date.toLocaleString('default', {
        month: 'long',
      });

      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          month: monthName,
          amount: 0,
          count: 0,
        });
      }

      const data = monthlyData.get(month)!;

      data.amount += Number(payment.amount);
      data.count += 1;
    });

    return Array.from(monthlyData.values());
  } catch (error: any) {
    logger.error(`Get monthly trends error: ${error.message}`);
    throw error;
  }
};

export const getPaymentMethodDistribution = async (schoolId: string) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { school_id: BigInt(schoolId) },
      select: {
        payment_method: true,
        amount: true,
      },
    });

    const methodMap = new Map<
      string,
      {
        amount: number;
        count: number;
      }
    >();

    payments.forEach((payment) => {
      const method = payment.payment_method || 'Unknown';

      if (!methodMap.has(method)) {
        methodMap.set(method, {
          amount: 0,
          count: 0,
        });
      }

      const data = methodMap.get(method)!;

      data.amount += Number(payment.amount);
      data.count += 1;
    });

    return Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
    }));
  } catch (error: any) {
    logger.error(`Get payment method distribution error: ${error.message}`);
    throw error;
  }
};

export const getRecentTransactions = async (schoolId: string, limit: number = 15) => {
  try {
    const transactions = await prisma.payment.findMany({
      where: { school_id: BigInt(schoolId) },
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        invoice: {
          include: {
            student: true,
          },
        },
      },
    });

    return transactions.map((t) => ({
      id: t.id.toString(),

      studentId: t.invoice.student.admission_number,

      studentName: `${t.invoice.student.first_name} ${
        t.invoice.student.last_name ?? ''
      }`.trim(),

      amount: Number(t.amount),

      paymentMethod: t.payment_method,

      transactionId: t.transaction_id,

      totalAmount: Number(t.invoice.total_amount),

      amountPaid: Number(t.invoice.paid_amount ?? 0),

      paymentStatus: t.invoice.status ?? 'paid',

      date: t.payment_date,
    }));
  } catch (error: any) {
    logger.error(`Get recent transactions error: ${error.message}`);
    throw error;
  }
};

export const getPendingPaymentsReport = async (schoolId: string, limit: number = 20) => {
  try {
    const pending = await prisma.invoice.findMany({
      where: {
        school_id: BigInt(schoolId),
        pending_amount: {
          gt: 0,
        },
      },
      take: limit,
      orderBy: {
        due_date: 'asc',
      },
      include: {
        student: true,
      },
    });

    return pending.map((p) => ({
      studentId: p.student.admission_number,

      studentName: `${p.student.first_name} ${
        p.student.last_name ?? ''
      }`.trim(),

      email: p.student.email || '',

      totalAmount: Number(p.total_amount),

      amountPaid: Number(p.paid_amount ?? 0),

      amountPending: Number(p.pending_amount),

      dueDate: p.due_date,

      status: p.status,

      daysOverdue:
        p.due_date < new Date()
          ? Math.floor(
              (Date.now() - p.due_date.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
    }));
  } catch (error: any) {
    logger.error(`Get pending payments error: ${error.message}`);
    throw error;
  }
};

/**
 * Refund report
 * Fetches recent refund requests with their associated student.
 */
export const getRefundRequestsReport = async (schoolId: string, limit: number = 10) => {
  try {
    const refunds = await prisma.refund_request.findMany({
      where: { school_id: BigInt(schoolId) },
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        student: true,
      },
    });

    return refunds.map((r) => ({
      id: r.id.toString(),
      studentId: r.student_id.toString(),
      studentName: `${r.student.first_name} ${
        r.student.last_name ?? ''
      }`.trim(),
      amount: Number(r.amount),
      reason: r.reason,
      status: r.status,
      requestDate: r.created_at,
      processedDate: r.processed_date,
    }));
  } catch (error: any) {
    logger.error(`Get refund requests error: ${error.message}`);
    throw error;
  }
};

export const getComprehensiveReportData = async (schoolId: string) => {
  try {
    const [
      dashboardStats,
      monthlyTrends,
      paymentMethods,
      recentTransactions,
      pendingPayments,
      refundRequests,
    ] = await Promise.all([
      getDashboardStats(schoolId),
      getMonthlyCollectionTrends(schoolId),
      getPaymentMethodDistribution(schoolId),
      getRecentTransactions(schoolId, 15),
      getPendingPaymentsReport(schoolId, 20),
      getRefundRequestsReport(schoolId, 10),
    ]);

    return {
      dashboardStats,
      monthlyTrends,
      paymentMethods,
      recentTransactions,
      pendingPayments,
      refundRequests,
    };
  } catch (error: any) {
    logger.error(`Get comprehensive report data error: ${error.message}`);
    throw error;
  }
};

export default {
  getDashboardStats,
  getMonthlyCollectionTrends,
  getPaymentMethodDistribution,
  getRecentTransactions,
  getPendingPaymentsReport,
  getRefundRequestsReport,
  getComprehensiveReportData,
};
