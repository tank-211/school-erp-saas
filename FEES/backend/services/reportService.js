import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

/**
 * Report Service
 * Handles fetching and preparing data for various reports
 */
export class ReportService {
  /**
   * Get dashboard statistics for report generation
   * Fetches: total fees collected, pending payments, overdue payments
   */
  static async getDashboardStats() {
    try {
      // Total fees collected from all payments in the last year
      const totalFeesCollected = await prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          createdAt: {
            gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
      });

      // Pending payments
      const pendingPayments = await prisma.feePayment.aggregate({
        _sum: {
          amountPending: true,
        },
        where: {
          paymentStatus: {
            in: ['PENDING', 'PARTIAL', 'OVERDUE'],
          },
          isActive: true,
        },
      });

      // Overdue payments
      const overduePayments = await prisma.feePayment.aggregate({
        _sum: {
          amountPending: true,
        },
        where: {
          paymentStatus: {
            in: ['OVERDUE', 'PARTIAL'],
          },
          dueDate: {
            lt: new Date(),
          },
          amountPending: {
            gt: 0,
          },
          isActive: true,
        },
      });

      // Refund requests
      const refundRequests = await prisma.refundRequest.aggregate({
        _sum: {
          amount: true,
        },
        _count: true,
        where: {
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
      });

      return {
        totalFeesCollected: parseFloat(totalFeesCollected._sum.amount || 0),
        pendingPayments: parseFloat(pendingPayments._sum.amountPending || 0),
        overduePayments: parseFloat(overduePayments._sum.amountPending || 0),
        refundRequests: parseFloat(refundRequests._sum.amount || 0),
        refundCount: refundRequests._count,
      };
    } catch (error) {
      logger.error(`Get dashboard stats error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get monthly collection trends
   * Returns collection data for the current year
   */
  static async getMonthlyCollectionTrends() {
    try {
      const payments = await prisma.payment.groupBy({
        by: ['createdAt'],
        _sum: {
          amount: true,
        },
        _count: true,
        where: {
          createdAt: {
            gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Aggregate by month
      const monthlyData = {};
      payments.forEach((payment) => {
        const date = new Date(payment.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date),
            amount: 0,
            count: 0,
          };
        }
        
        monthlyData[monthKey].amount += parseFloat(payment._sum.amount || 0);
        monthlyData[monthKey].count += payment._count;
      });

      return Object.values(monthlyData);
    } catch (error) {
      logger.error(`Get monthly collection trends error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment method distribution
   */
  static async getPaymentMethodDistribution() {
    try {
      const distribution = await prisma.payment.groupBy({
        by: ['paymentMethod'],
        _sum: {
          amount: true,
        },
        _count: true,
      });

      return distribution.map((item) => ({
        method: item.paymentMethod,
        amount: parseFloat(item._sum.amount || 0),
        count: item._count,
      }));
    } catch (error) {
      logger.error(`Get payment method distribution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent transactions with student details
   * @param {number} limit - Number of recent transactions to fetch
   */
  static async getRecentTransactions(limit = 10) {
    try {
      const transactions = await prisma.payment.findMany({
        take: -limit, // Last N records
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          transactionId: true,
          createdAt: true,
          feePayment: {
            select: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  studentId: true,
                },
              },
              totalAmount: true,
              amountPaid: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return transactions.map((t) => ({
        id: t.id,
        studentName: `${t.feePayment.student.firstName} ${t.feePayment.student.lastName}`,
        studentId: t.feePayment.student.studentId,
        amount: parseFloat(t.amount),
        paymentMethod: t.paymentMethod,
        transactionId: t.transactionId || 'N/A',
        totalAmount: parseFloat(t.feePayment.totalAmount),
        amountPaid: parseFloat(t.feePayment.amountPaid),
        paymentStatus: t.feePayment.paymentStatus,
        date: t.createdAt,
      }));
    } catch (error) {
      logger.error(`Get recent transactions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pending payments list for report
   * @param {number} limit - Maximum records to fetch
   */
  static async getPendingPaymentsReport(limit = 20) {
    try {
      const pendingPayments = await prisma.feePayment.findMany({
        where: {
          paymentStatus: {
            in: ['PENDING', 'PARTIAL', 'OVERDUE'],
          },
          isActive: true,
        },
        select: {
          id: true,
          totalAmount: true,
          amountPaid: true,
          amountPending: true,
          dueDate: true,
          paymentStatus: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
              email: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: limit,
      });

      return pendingPayments.map((p) => ({
        studentId: p.student.studentId,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        email: p.student.email || 'N/A',
        totalAmount: parseFloat(p.totalAmount),
        amountPaid: parseFloat(p.amountPaid),
        amountPending: parseFloat(p.amountPending),
        dueDate: p.dueDate,
        status: p.paymentStatus,
        daysOverdue:
          p.paymentStatus === 'OVERDUE'
            ? Math.floor((new Date() - p.dueDate) / (1000 * 60 * 60 * 24))
            : 0,
      }));
    } catch (error) {
      logger.error(`Get pending payments report error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get refund requests for report
   */
  static async getRefundRequestsReport(limit = 20) {
    try {
      const refundRequests = await prisma.refundRequest.findMany({
        where: {
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
        select: {
          id: true,
          amount: true,
          reason: true,
          status: true,
          requestDate: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
          approver: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          requestDate: 'desc',
        },
        take: limit,
      });

      return refundRequests.map((r) => ({
        id: r.id,
        studentId: r.student.studentId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        amount: parseFloat(r.amount),
        reason: r.reason,
        status: r.status,
        requestDate: r.requestDate,
        approver: r.approver
          ? `${r.approver.firstName} ${r.approver.lastName}`
          : 'Pending',
      }));
    } catch (error) {
      logger.error(`Get refund requests report error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comprehensive report data
   */
  static async getComprehensiveReportData() {
    try {
      const [
        dashboardStats,
        monthlyTrends,
        paymentMethods,
        recentTransactions,
        pendingPayments,
        refundRequests,
      ] = await Promise.all([
        this.getDashboardStats(),
        this.getMonthlyCollectionTrends(),
        this.getPaymentMethodDistribution(),
        this.getRecentTransactions(15),
        this.getPendingPaymentsReport(15),
        this.getRefundRequestsReport(10),
      ]);

      return {
        generatedAt: new Date(),
        dashboardStats,
        monthlyTrends,
        paymentMethods,
        recentTransactions,
        pendingPayments,
        refundRequests,
      };
    } catch (error) {
      logger.error(`Get comprehensive report data error: ${error.message}`);
      throw error;
    }
  }
}

export default ReportService;
