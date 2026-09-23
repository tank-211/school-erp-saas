import FeePayment from '../models/FeePayment.js';
import Student from '../models/Student.js';
import {
  calculatePendingAmount,
  getPaymentStatus
} from '../utils/feeCalculations.js';
import logger from '../config/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FeePaymentService {

  /*
   * ============================================================
   * LEGACY MONGOOSE METHODS
   * ============================================================
   *
   * These are kept temporarily because existing legacy routes
   * may still use them.
   */

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

  static async getPendingPayments(filters = {}, skip = 0, limit = 10) {
    try {
      const query = {
        paymentStatus: {
          $in: ['pending', 'partial', 'overdue']
        },
        ...filters
      };

      const payments = await FeePayment.find(query)
        .populate('student')
        .populate('feeStructure')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1 });

      const total = await FeePayment.countDocuments(query);

      return {
        payments,
        total
      };
    } catch (error) {
      logger.error(`Get pending payments error: ${error.message}`);
      throw error;
    }
  }

  static async getOverduePayments(
    gracePeriodDays = 0,
    skip = 0,
    limit = 10
  ) {
    try {
      const graceDate = new Date();

      graceDate.setDate(
        graceDate.getDate() + gracePeriodDays
      );

      const query = {
        dueDate: {
          $lt: graceDate
        },
        paymentStatus: {
          $ne: 'paid'
        }
      };

      const payments = await FeePayment.find(query)
        .populate('student')
        .populate('feeStructure')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1 });

      const total = await FeePayment.countDocuments(query);

      return {
        payments,
        total
      };
    } catch (error) {
      logger.error(`Get overdue payments error: ${error.message}`);
      throw error;
    }
  }

  /*
   * ============================================================
   * CURRENT PRISMA / POSTGRESQL FEES SYSTEM
   * ============================================================
   */

  static async getDashboardStats(schoolId) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required');
      }

      const schoolIdBigInt = BigInt(schoolId);

      const stats = await prisma.invoice.aggregate({
        where: {
          school_id: schoolIdBigInt
        },
        _sum: {
          total_amount: true,
          paid_amount: true,
          pending_amount: true
        }
      });

      return {
        total_amount: Number(
          stats._sum.total_amount || 0
        ),
        paid_amount: Number(
          stats._sum.paid_amount || 0
        ),
        pending_amount: Number(
          stats._sum.pending_amount || 0
        )
      };
    } catch (error) {
      logger.error(
        `Get dashboard stats error: ${error.message}`
      );

      throw error;
    }
  }

  /*
   * Get recent payments from the CURRENT payment table.
   */
  static async getRecentTransactions(
    limit = 5,
    schoolId = null
  ) {
    try {
      const where = {};

      if (schoolId) {
        where.school_id = BigInt(schoolId);
      }

      const transactions =
        await prisma.payment.findMany({
          where,
          take: Number(limit) || 5,
          orderBy: {
            created_at: 'desc'
          },
          include: {
            invoice: {
              select: {
                id: true,
                invoice_number: true
              }
            },
            student: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                admission_number: true
              }
            }
          }
        });

      return transactions.map((transaction) => ({
        id: transaction.id?.toString(),

        studentName: [
          transaction.student?.first_name,
          transaction.student?.middle_name,
          transaction.student?.last_name
        ]
          .filter(Boolean)
          .join(' ') || 'N/A',

        studentId:
          transaction.student?.admission_number ||
          'N/A',

        invoiceNo:
          transaction.invoice?.invoice_number ||
          'N/A',

        amount: Number(
          transaction.amount || 0
        ),

        method:
          transaction.payment_method ||
          'N/A',

        status:
          transaction.status ||
          'N/A',

        transactionDate:
          transaction.payment_date ||
          transaction.created_at,

        transactionId:
          transaction.transaction_id ||
          null
      }));
    } catch (error) {
      logger.error(
        `Get recent transactions error: ${error.message}`
      );

      throw error;
    }
  }

  /*
   * Get pending invoices from CURRENT PostgreSQL system.
   */
  static async getPendingFees(
    filters = {},
    skip = 0,
    limit = 10
  ) {
    try {
      const where = {
        pending_amount: {
          gt: 0
        },
        status: {
          in: [
            'unpaid',
            'partial',
            'pending'
          ]
        }
      };

      if (filters.schoolId) {
        where.school_id = BigInt(
          filters.schoolId
        );
      }

      if (filters.studentId) {
        where.student_id = BigInt(
          filters.studentId
        );
      }

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
                  admission_number: true
                }
              }
            },

            orderBy: {
              created_at: 'desc'
            },

            skip,
            take: limit
          }),

          prisma.invoice.count({
            where
          })
        ]);

      return {
        payments: invoices,
        total,
        page:
          Math.floor(skip / limit) + 1,
        limit
      };
    } catch (error) {
      logger.error(
        `Get pending fees error: ${error.message}`
      );

      throw error;
    }
  }

  /*
   * Count pending invoices.
   */
  static async countPendingFees(
    filters = {}
  ) {
    try {
      const where = {
        pending_amount: {
          gt: 0
        },
        status: {
          in: [
            'unpaid',
            'partial',
            'pending'
          ]
        }
      };

      if (filters.schoolId) {
        where.school_id = BigInt(
          filters.schoolId
        );
      }

      if (filters.studentId) {
        where.student_id = BigInt(
          filters.studentId
        );
      }

      return await prisma.invoice.count({
        where
      });
    } catch (error) {
      logger.error(
        `Count pending fees error: ${error.message}`
      );

      throw error;
    }
  }

  /*
   * Get overdue invoices.
   */
  static async getOverduePaymentsPrisma(
    schoolId = null,
    skip = 0,
    limit = 10
  ) {
    try {
      const where = {
        due_date: {
          lt: new Date()
        },
        pending_amount: {
          gt: 0
        }
      };

      if (schoolId) {
        where.school_id = BigInt(
          schoolId
        );
      }

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
                  admission_number: true
                }
              }
            },

            orderBy: {
              due_date: 'asc'
            },

            skip,
            take: limit
          }),

          prisma.invoice.count({
            where
          })
        ]);

      return {
        payments: invoices,
        total,
        page:
          Math.floor(skip / limit) + 1,
        limit
      };
    } catch (error) {
      logger.error(
        `Get overdue payments error: ${error.message}`
      );

      throw error;
    }
  }

  /*
   * Submit a payment against an invoice.
   *
   * This is the CURRENT PostgreSQL payment flow.
   */
  static async submitInvoicePayment(
    invoiceId,
    paymentData,
    schoolId
  ) {
    try {
      if (!invoiceId) {
        throw new Error(
          'Invoice ID is required'
        );
      }

      if (!schoolId) {
        throw new Error(
          'School ID is required'
        );
      }

      const amount = Number(
        paymentData.amount
      );

      if (!amount || amount <= 0) {
        throw new Error(
          'Payment amount must be greater than zero'
        );
      }

      const invoice =
        await prisma.invoice.findFirst({
          where: {
            id: BigInt(invoiceId),
            school_id: BigInt(schoolId)
          }
        });

      if (!invoice) {
        throw new Error(
          'Invoice not found'
        );
      }

      const totalAmount =
        Number(invoice.total_amount);

      const currentPaid =
        Number(invoice.paid_amount || 0);

      const currentPending =
        Number(invoice.pending_amount || 0);

      if (amount > currentPending) {
        throw new Error(
          `Payment amount (₹${amount}) cannot exceed pending amount (₹${currentPending})`
        );
      }

      const newPaid =
        currentPaid + amount;

      const newPending =
        totalAmount - newPaid;

      const newStatus =
        newPending <= 0
          ? 'paid'
          : newPaid > 0
            ? 'partial'
            : 'unpaid';

      const result =
        await prisma.$transaction(
          async (tx) => {

            const payment =
              await tx.payment.create({
                data: {
                  school_id:
                    invoice.school_id,

                  student_id:
                    invoice.student_id,

                  invoice_id:
                    invoice.id,

                  payment_number:
                    `PAY-${Date.now()}`,

                  amount,

                  payment_date:
                    new Date(),

                  payment_method:
                    paymentData.paymentMethod ||
                    'cash',

                  transaction_id:
                    paymentData.transactionId ||
                    null,

                  status:
                    newStatus,

                  remarks:
                    paymentData.notes ||
                    null
                }
              });

            const updatedInvoice =
              await tx.invoice.update({
                where: {
                  id: invoice.id
                },

                data: {
                  paid_amount:
                    newPaid,

                  pending_amount:
                    newPending,

                  status:
                    newStatus,

                  updated_at:
                    new Date()
                }
              });

            return {
              payment,
              invoice:
                updatedInvoice
            };
          }
        );

      return {
        payment: result.payment,
        invoice: result.invoice
      };

    } catch (error) {
      logger.error(
        `Submit invoice payment error: ${error.message}`
      );

      throw error;
    }
  }
}