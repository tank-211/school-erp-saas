import FeePayment from '../models/FeePayment.js';
import Student from '../models/Student.js';
import {
  calculateOverdueFee,
  calculatePendingAmount,
  getPaymentStatus
} from '../utils/feeCalculations.js';
import logger from '../config/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FeePaymentService {
  static async createFeePayment(paymentData) {
    try {
      const student = await Student.findById(paymentData.student);
      if (!student) {
        throw new Error('Student not found');
      }

      const paymentStatus = getPaymentStatus(
        paymentData.totalAmount,
        0,
        paymentData.dueDate
      );

      const feePayment = new FeePayment({
        ...paymentData,
        amountPending: paymentData.totalAmount,
        paymentStatus
      });

      await feePayment.save();
      await feePayment.populate('student').populate('feeStructure');

      logger.info(`Fee payment created: ${feePayment._id}`);
      return feePayment;
    } catch (error) {
      logger.error(`Create fee payment error: ${error.message}`);
      throw error;
    }
  }

  static async recordPayment(feePaymentId, paymentData, userId) {
    try {
      const feePayment = await FeePayment.findById(feePaymentId);

      if (!feePayment) {
        throw new Error('Fee payment not found');
      }

      feePayment.payments.push({
        ...paymentData,
        receivedBy: userId
      });

      feePayment.amountPaid += paymentData.amount;
      feePayment.amountPending = calculatePendingAmount(
        feePayment.totalAmount,
        feePayment.amountPaid
      );

      feePayment.paymentStatus = getPaymentStatus(
        feePayment.totalAmount,
        feePayment.amountPaid,
        feePayment.dueDate
      );

      await feePayment.save();

      logger.info(`Payment recorded for: ${feePaymentId}`);
      return feePayment;
    } catch (error) {
      logger.error(`Record payment error: ${error.message}`);
      throw error;
    }
  }

  static async getPendingPayments(filters, skip, limit) {
    try {
      const query = {
        paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
        ...filters
      };

      const payments = await FeePayment.find(query)
        .populate('student')
        .populate('feeStructure')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1 });

      const total = await FeePayment.countDocuments(query);

      return { payments, total };
    } catch (error) {
      logger.error(`Get pending payments error: ${error.message}`);
      throw error;
    }
  }

  static async getOverduePayments(gracePeriodDays = 0, skip, limit) {
    try {
      const now = new Date();
      const graceDate = new Date();
      graceDate.setDate(graceDate.getDate() + gracePeriodDays);

      const query = {
        dueDate: { $lt: graceDate },
        paymentStatus: { $ne: 'paid' }
      };

      const payments = await FeePayment.find(query)
        .populate('student')
        .populate('feeStructure')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1 });

      const total = await FeePayment.countDocuments(query);

      return { payments, total };
    } catch (error) {
      logger.error(`Get overdue payments error: ${error.message}`);
      throw error;
    }
  }

  static async getDashboardStats() {
    try {
      const stats = await FeePayment.aggregate([
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalCollected: { $sum: '$amountPaid' }
          }
        }
      ]);

      const totalCollected = await FeePayment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]);

      const paymentByMethod = await FeePayment.aggregate([
        { $unwind: '$payments' },
        {
          $group: {
            _id: '$payments.paymentMethod',
            count: { $sum: 1 },
            total: { $sum: '$payments.amount' }
          }
        }
      ]);

      return {
        statsByStatus: stats,
        totalCollected: totalCollected[0]?.total || 0,
        paymentByMethod
      };
    } catch (error) {
      logger.error(`Get dashboard stats error: ${error.message}`);
      throw error;
    }
  }

  static async getMonthlyCollectionData(year) {
    try {
      const data = await FeePayment.aggregate([
        {
          $unwind: '$payments'
        },
        {
          $match: {
            'payments.paymentDate': {
              $gte: new Date(`${year}-01-01`),
              $lt: new Date(`${year + 1}-01-01`)
            }
          }
        },
        {
          $group: {
            _id: {
              $month: '$payments.paymentDate'
            },
            total: { $sum: '$payments.amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return data;
    } catch (error) {
      logger.error(`Get monthly collection data error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches comprehensive financial dashboard data including:
   * 1. Monthly collection data (amount grouped by month for current year)
   * 2. Payment method distribution
   * 3. 5 most recent transactions with student and class details
   */
  static async getFinancialDashboardData(year = new Date().getFullYear()) {
    try {
      // Query 1: Monthly collection data (sum of amount grouped by month)
      const monthlyData = await prisma.payment.groupBy({
        by: ['createdAt'],
        _sum: {
          amount: true
        },
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`)
          }
        }
      });

      // Transform monthly data into monthly buckets
      const monthlyCollectionMap = new Map();
      monthlyData.forEach(item => {
        const month = new Date(item.createdAt).getMonth() + 1;
        if (!monthlyCollectionMap.has(month)) {
          monthlyCollectionMap.set(month, 0);
        }
        monthlyCollectionMap.set(month, monthlyCollectionMap.get(month) + Number(item._sum.amount || 0));
      });

      // Format monthly data for bar chart
      const monthlyCollectionForChart = Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        monthName: new Date(year, index).toLocaleString('default', { month: 'short' }),
        amount: monthlyCollectionMap.get(index + 1) || 0
      }));

      // Query 2: Payment method distribution
      const paymentMethodDistribution = await prisma.payment.groupBy({
        by: ['paymentMethod'],
        _count: {
          id: true
        },
        _sum: {
          amount: true
        }
      });

      // Transform payment method data for pie chart
      const paymentMethodForChart = paymentMethodDistribution.map(item => ({
        method: item.paymentMethod,
        count: item._count.id,
        totalAmount: Number(item._sum.amount || 0)
      }));

      // Query 3: 5 most recent transactions with student and class details
      const recentTransactions = await prisma.payment.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          feePayment: {
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  studentId: true
                }
              },
              feeStructure: {
                include: {
                  class: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Format recent transactions with required fields
      const formattedTransactions = recentTransactions.map(transaction => {
        const student = transaction.feePayment?.student;
        const classInfo = transaction.feePayment?.feeStructure?.class;
        const feePaymentStatus = transaction.feePayment?.paymentStatus;

        return {
          id: transaction.id,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'N/A',
          studentId: student?.studentId || 'N/A',
          invoiceNo: transaction.id, // Using transaction ID as invoice number, adjust if you have a different field
          class: classInfo?.name || 'N/A',
          amount: Number(transaction.amount),
          method: transaction.paymentMethod,
          status: feePaymentStatus || 'UNKNOWN',
          transactionDate: transaction.createdAt,
          transactionId: transaction.transactionId
        };
      });

      // Combine all data into single response object
      const dashboardData = {
        year,
        monthlyCollection: {
          title: 'Monthly Fee Collection',
          data: monthlyCollectionForChart,
          totalCollected: monthlyCollectionForChart.reduce((sum, item) => sum + item.amount, 0)
        },
        paymentMethodDistribution: {
          title: 'Payment Method Distribution',
          data: paymentMethodForChart,
          total: paymentMethodForChart.reduce((sum, item) => sum + item.count, 0)
        },
        recentTransactions: {
          title: 'Recent Transactions',
          data: formattedTransactions,
          count: formattedTransactions.length
        },
        summary: {
          totalCollected: paymentMethodForChart.reduce((sum, item) => sum + item.totalAmount, 0),
          totalTransactions: paymentMethodForChart.reduce((sum, item) => sum + item.count, 0),
          averageTransactionAmount: paymentMethodForChart.length > 0 
            ? paymentMethodForChart.reduce((sum, item) => sum + item.totalAmount, 0) / 
              paymentMethodForChart.reduce((sum, item) => sum + item.count, 0)
            : 0
        }
      };

      logger.info(`Financial dashboard data retrieved for year ${year}`);
      return dashboardData;
    } catch (error) {
      logger.error(`Get financial dashboard data error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit fee payment from frontend
   * Saves fee payment record to database with validation
   * @param {Object} paymentData - Fee payment data from frontend
   * @returns {Promise<Object>} - Created fee payment record
   */
  static async submitFeePayment(paymentData) {
    try {
      // Validate that amountPaid does not exceed totalAmount
      if (paymentData.amountPaid > paymentData.totalAmount) {
        const error = new Error(`Amount paid (₹${paymentData.amountPaid}) cannot exceed total amount (₹${paymentData.totalAmount})`);
        error.statusCode = 400;
        throw error;
      }

      // Calculate amountPending
      const amountPending = paymentData.totalAmount - paymentData.amountPaid;

      // Determine payment status based on amountPaid and totalAmount
      let paymentStatus = paymentData.paymentStatus || 'pending';
      if (paymentData.amountPaid === paymentData.totalAmount) {
        paymentStatus = 'paid';
      } else if (paymentData.amountPaid > 0) {
        paymentStatus = 'partial';
      }

      // Create fee payment record
      const feePayment = new FeePayment({
        totalAmount: paymentData.totalAmount,
        amountPaid: paymentData.amountPaid,
        amountPending: amountPending,
        paymentMethod: paymentData.paymentMethod,
        paymentStatus: paymentStatus,
        student: paymentData.student || null,
        dueDate: paymentData.dueDate || null,
        payments: paymentData.amountPaid > 0 ? [
          {
            amount: paymentData.amountPaid,
            paymentMethod: paymentData.paymentMethod,
            paymentDate: new Date()
          }
        ] : []
      });

      // Save to database
      await feePayment.save();
      
      // Populate references if available
      if (feePayment.student) {
        await feePayment.populate('student');
      }

      logger.info(`Fee payment submitted and saved: ${feePayment._id}`);
      return feePayment;
    } catch (error) {
      logger.error(`Submit fee payment error: ${error.message}`);
      throw error;
    }
  }

  /**
<<<<<<< HEAD
   * Get a single fee payment by ID with related data
   */
  static async getFeePaymentById(id) {
    try {
      const feePayment = await prisma.feePayment.findUnique({
        where: { id },
        include: {
          student: {
            include: {
              course: true,
              class: true
            }
          },
          feeStructure: {
            include: {
              components: true
            }
          },
          payments: true
        }
      });

      return feePayment;
    } catch (error) {
      logger.error(`Get fee payment by ID error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pending fees with filters and pagination
   */
  static async getPendingFees(filters = {}, skip = 0, limit = 10) {
    try {
      const where = {
        paymentStatus: {
          in: ['PENDING', 'PARTIAL', 'OVERDUE']
        }
      };

      if (filters.studentId) {
        where.studentId = filters.studentId;
      }
      if (filters.classId) {
        where.student = {
          classId: filters.classId
        };
      }

      const pendingFees = await prisma.feePayment.findMany({
        where,
        include: {
          student: {
            include: {
              course: true,
              class: true
            }
          }
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit
      });

      return pendingFees;
    } catch (error) {
      logger.error(`Get pending fees error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count pending fees matching filters
   */
  static async countPendingFees(filters = {}) {
    try {
      const where = {
        paymentStatus: {
          in: ['PENDING', 'PARTIAL', 'OVERDUE']
        }
      };

      if (filters.studentId) {
        where.studentId = filters.studentId;
      }
      if (filters.classId) {
        where.student = {
          classId: filters.classId
        };
      }

      const count = await prisma.feePayment.count({ where });
      return count;
    } catch (error) {
      logger.error(`Count pending fees error: ${error.message}`);
=======
   * Get recent transactions with customizable limit
   * @param {number} limit - Number of recent transactions to fetch (default: 5)
   * @returns {Promise<Array>} - Array of formatted recent transactions
   */
  static async getRecentTransactions(limit = 5) {
    try {
      // Query recent payments with related data
      const recentTransactions = await prisma.payment.findMany({
        take: parseInt(limit) || 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          feePayment: {
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  studentId: true
                }
              },
              feeStructure: {
                include: {
                  class: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Format recent transactions with required fields
      const formattedTransactions = recentTransactions.map(transaction => {
        const student = transaction.feePayment?.student;
        const classInfo = transaction.feePayment?.feeStructure?.class;
        const feePaymentStatus = transaction.feePayment?.paymentStatus;

        return {
          id: transaction.id,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'N/A',
          studentId: student?.studentId || 'N/A',
          invoiceNo: transaction.id,
          class: classInfo?.name || 'N/A',
          amount: Number(transaction.amount),
          method: transaction.paymentMethod,
          status: feePaymentStatus || 'UNKNOWN',
          transactionDate: transaction.createdAt,
          transactionId: transaction.transactionId
        };
      });

      logger.info(`Retrieved ${formattedTransactions.length} recent transactions`);
      return formattedTransactions;
    } catch (error) {
      logger.error(`Get recent transactions error: ${error.message}`);
>>>>>>> fb830a8cde2f8184c9b1c9a6fa1b5ff18bd74c3f
      throw error;
    }
  }
}
