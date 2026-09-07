// ================================================================
// DASHBOARD SERVICE - Analytics & Metrics Queries
// ================================================================
// Uses the current Prisma schema.
//
// All dashboard queries are scoped by authenticated school_id.
//
// Current schema models used:
// - payment
// - invoice
// - student
// - admission
// - school_class
// - refund_request
// ================================================================

import prisma from '../config/database';
import logger from '../config/logger';

export class DashboardService {
  /**
   * Convert the authenticated school ID into the BigInt
   * required by the current Prisma schema.
   */
  private static getSchoolId(schoolId: string): bigint {
    return BigInt(schoolId);
  }

  /**
   * Get dashboard headline metrics.
   *
   * Collected:
   *   payment.amount from the last 12 months
   *
   * Pending:
   *   invoice.pending_amount > 0
   *
   * Overdue:
   *   invoice.pending_amount > 0 and due_date < now
   *
   * Refund requests:
   *   refund_request.amount for this school
   */
  static async getDashboardMetrics(schoolId: string) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `📊 Fetching dashboard metrics for school ${schoolId}`
      );

      const twelveMonthsAgo = new Date(
        Date.now() - 12 * 30 * 24 * 60 * 60 * 1000
      );

      const now = new Date();

      const [
        totalCollected,
        invoices,
        refundRequests
      ] = await Promise.all([
        prisma.payment.aggregate({
          _sum: {
            amount: true
          },
          where: {
            school_id: schoolIdBigInt,
            payment_date: {
              gte: twelveMonthsAgo
            },
            status: {
              not: 'cancelled'
            }
          }
        }),

        prisma.invoice.findMany({
          where: {
            school_id: schoolIdBigInt
          },
          select: {
            id: true,
            total_amount: true,
            due_date: true,

            payment: {
              where: {
                status: {
                  not: 'cancelled'
                }
              },
              select: {
                amount: true
              }
            }
          }
        }),

        prisma.refund_request.aggregate({
          _sum: {
            amount: true
          },
          where: {
            school_id: schoolIdBigInt
          }
        })
      ]);

      let totalPending = 0;
      let totalOverdue = 0;

      for (const invoice of invoices) {
        const totalAmount = Number(invoice.total_amount ?? 0);

        const paidAmount = invoice.payment.reduce(
          (sum, payment) =>
            sum + Number(payment.amount ?? 0),
          0
        );

        const pendingAmount = Math.max(
          totalAmount - paidAmount,
          0
        );

        if (pendingAmount > 0) {
          totalPending += pendingAmount;

          if (invoice.due_date < now) {
            totalOverdue += pendingAmount;
          }
        }
      }

      const metrics = {
        totalFeesCollected: Number(
          totalCollected._sum.amount ?? 0
        ),

        pendingPayments: totalPending,

        overduePayments: totalOverdue,

        refundRequests: Number(
          refundRequests._sum.amount ?? 0
        )
      };

      logger.info(
        `✅ Dashboard metrics fetched for school ${schoolId}`,
        metrics
      );

      return metrics;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error';

      logger.error(
        `Error fetching dashboard metrics for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get monthly collection trend.
   *
   * Uses payment_date because this represents the actual
   * payment/collection date.
   */
  static async getMonthlyCollectionTrend(
    schoolId: string,
    year: number = new Date().getFullYear()
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `📈 Fetching monthly collection trend for school ${schoolId}, year ${year}`
      );

      const payments = await prisma.$queryRaw<
        Array<{
          collection_month: Date;
          month_name: string;
          month_number: number;
          collected_amount: number;
          transaction_count: number;
        }>
      >`
        SELECT
          DATE_TRUNC(
            'month',
            p.payment_date
          )::DATE AS collection_month,

          TO_CHAR(
            DATE_TRUNC(
              'month',
              p.payment_date
            ),
            'Mon'
          ) AS month_name,

          EXTRACT(
            MONTH FROM p.payment_date
          )::INT AS month_number,

          COALESCE(
            SUM(p.amount),
            0
          )::FLOAT AS collected_amount,

          COUNT(p.id)::INT AS transaction_count

        FROM payment p

        WHERE p.school_id = ${schoolIdBigInt}
          AND EXTRACT(
            YEAR FROM p.payment_date
          ) = ${year}
          AND p.status <> 'cancelled'

        GROUP BY
          DATE_TRUNC(
            'month',
            p.payment_date
          )

        ORDER BY
          DATE_TRUNC(
            'month',
            p.payment_date
          ) ASC
      `;

      logger.info(
        `✅ Monthly collection trend fetched: ${payments.length} months`
      );

      return payments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching monthly trend for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get payment method distribution.
   *
   * Last 12 months, scoped to the authenticated school.
   */
  static async getPaymentMethodDistribution(
    schoolId: string
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `💳 Fetching payment method distribution for school ${schoolId}`
      );

      const twelveMonthsAgo = new Date(
        Date.now() - 12 * 30 * 24 * 60 * 60 * 1000
      );

      const distribution = await prisma.payment.groupBy({
        by: ['payment_method'],

        _sum: {
          amount: true
        },

        _count: {
          id: true
        },

        where: {
          school_id: schoolIdBigInt,

          payment_date: {
            gte: twelveMonthsAgo
          },

          status: {
            not: 'cancelled'
          }
        }
      });

      const total = distribution.reduce(
        (sum, item) =>
          sum + Number(item._sum.amount ?? 0),
        0
      );

      const formattedDistribution = distribution
        .map((item) => {
          const totalAmount = Number(
            item._sum.amount ?? 0
          );

          return {
            paymentMethod: item.payment_method,
            totalAmount,
            transactionCount: item._count.id,

            percentage:
              total > 0
                ? (
                    (totalAmount / total) *
                    100
                  ).toFixed(2)
                : '0.00'
          };
        })
        .sort(
          (a, b) =>
            b.totalAmount - a.totalAmount
        );

      logger.info(
        `✅ Payment method distribution fetched for school ${schoolId}`
      );

      return formattedDistribution;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching payment method distribution for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get recent payment transactions.
   */
  static async getRecentTransactions(
    schoolId: string,
    limit: number = 10
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `📋 Fetching recent ${limit} transactions for school ${schoolId}`
      );

      const transactions =
        await prisma.payment.findMany({
          where: {
            school_id: schoolIdBigInt,

            status: {
              not: 'cancelled'
            }
          },

          take: limit,

          orderBy: {
            payment_date: 'desc'
          },

          select: {
            id: true,
            amount: true,
            payment_date: true,
            payment_method: true,
            transaction_id: true,
            status: true,
            created_at: true,

            student: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                admission_number: true,
                email: true,
                phone: true,

                admission: {
                  orderBy: {
                    admission_date: 'desc'
                  },

                  take: 1,

                  select: {
                    school_class: {
                      select: {
                        class_name: true
                      }
                    }
                  }
                }
              }
            },

            invoice: {
              select: {
                id: true,
                invoice_number: true,
                total_amount: true,
                paid_amount: true,
                pending_amount: true,
                status: true,
                due_date: true
              }
            }
          }
        });

      const formattedTransactions =
        transactions.map((transaction) => {
          const studentName = [
            transaction.student.first_name,
            transaction.student.middle_name,
            transaction.student.last_name
          ]
            .filter(Boolean)
            .join(' ');

          return {
            id: transaction.id.toString(),

            studentName,

            studentId:
              transaction.student.id.toString(),

            admissionNumber:
              transaction.student.admission_number,

            className:
              transaction.student.admission[0]
                ?.school_class?.class_name ?? 'N/A',

            invoiceId:
              transaction.invoice.id.toString(),

            invoiceNumber:
              transaction.invoice.invoice_number,

            amount:
              Number(transaction.amount),

            paymentMethod:
              transaction.payment_method,

            transactionId:
              transaction.transaction_id ?? null,

            totalAmount:
              Number(
                transaction.invoice.total_amount
              ),

            amountPaid:
              Number(
                transaction.invoice.paid_amount ?? 0
              ),

            amountPending:
              Number(
                transaction.invoice.pending_amount ?? 0
              ),

            paymentStatus:
              transaction.invoice.status ??
              transaction.status ??
              'pending',

            date:
              transaction.payment_date
                ? transaction.payment_date.toISOString()
                : null,

            dueDate:
              transaction.invoice.due_date,

            createdAt:
              transaction.created_at
          };
        });

      logger.info(
        `✅ Recent transactions fetched: ${formattedTransactions.length}`
      );

      return formattedTransactions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching recent transactions for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get payment status distribution.
   */
  static async getPaymentStatusDistribution(
    schoolId: string
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `📊 Fetching payment status distribution for school ${schoolId}`
      );

      const distribution =
        await prisma.payment.groupBy({
          by: ['status'],

          _count: {
            id: true
          },

          _sum: {
            amount: true
          },

          where: {
            school_id: schoolIdBigInt
          }
        });

      const formattedDistribution =
        distribution.map((item) => ({
          status: item.status ?? 'unknown',

          count: item._count.id,

          totalAmount:
            Number(item._sum.amount ?? 0)
        }));

      logger.info(
        `✅ Payment status distribution fetched for school ${schoolId}`
      );

      return formattedDistribution;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching payment status distribution for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get collection efficiency by class.
   *
   * Relationship:
   *
   * school_class
   *   ↓
   * admission
   *   ↓
   * student
   *   ↓
   * invoice
   */
  static async getCollectionByClass(
    schoolId: string
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `🎓 Fetching collection metrics by class for school ${schoolId}`
      );

      const classes =
        await prisma.school_class.findMany({
          where: {
            school_id: schoolIdBigInt
          },

          orderBy: {
            class_numeric_value: 'asc'
          }
        });

      const classMetrics =
        await Promise.all(
          classes.map(async (schoolClass) => {
            const admissions =
              await prisma.admission.findMany({
                where: {
                  school_id: schoolIdBigInt,
                  class_id: schoolClass.id
                },

                select: {
                  student_id: true
                }
              });

            const studentIds = [
              ...new Set(
                admissions.map(
                  (admission) =>
                    admission.student_id.toString()
                )
              )
            ].map((id) => BigInt(id));

            if (studentIds.length === 0) {
              return {
                className:
                  schoolClass.class_name,

                classCode:
                  schoolClass.class_numeric_value.toString(),

                studentCount: 0,

                totalFeesDue: 0,

                totalCollected: 0,

                totalPending: 0,

                collectionPercentage: '0.00'
              };
            }

            const [
              students,
              invoices
            ] = await Promise.all([
              prisma.student.findMany({
                where: {
                  school_id: schoolIdBigInt,

                  id: {
                    in: studentIds
                  },

                  status: 'active'
                },

                select: {
                  id: true
                }
              }),

              prisma.invoice.findMany({
                where: {
                  school_id: schoolIdBigInt,

                  student_id: {
                    in: studentIds
                  }
                },

                select: {
                  total_amount: true,
                  paid_amount: true,
                  pending_amount: true
                }
              })
            ]);

            const totalFeesDue =
              invoices.reduce(
                (sum, invoice) =>
                  sum +
                  Number(invoice.total_amount),
                0
              );

            const totalCollected =
              invoices.reduce(
                (sum, invoice) =>
                  sum +
                  Number(
                    invoice.paid_amount ?? 0
                  ),
                0
              );

            const totalPending =
              invoices.reduce(
                (sum, invoice) =>
                  sum +
                  Number(invoice.pending_amount),
                0
              );

            const collectionPercentage =
              totalFeesDue > 0
                ? (
                    (totalCollected /
                      totalFeesDue) *
                    100
                  ).toFixed(2)
                : '0.00';

            return {
              className:
                schoolClass.class_name,

              classCode:
                schoolClass.class_numeric_value.toString(),

              studentCount:
                students.length,

              totalFeesDue,

              totalCollected,

              totalPending,

              collectionPercentage
            };
          })
        );

      logger.info(
        `✅ Collection by class fetched for ${classMetrics.length} classes`
      );

      return classMetrics.sort(
        (a, b) =>
          parseFloat(
            b.collectionPercentage
          ) -
          parseFloat(
            a.collectionPercentage
          )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching collection by class for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get students with outstanding balances.
   */
  static async getOutstandingBalances(
    schoolId: string,
    limit: number = 20
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `📌 Fetching outstanding balances for school ${schoolId}`
      );

      const students =
        await prisma.student.findMany({
          where: {
            school_id: schoolIdBigInt,

            status: 'active',

            invoice: {
              some: {
                school_id: schoolIdBigInt,

                pending_amount: {
                  gt: 0
                }
              }
            }
          },

          select: {
            id: true,
            first_name: true,
            middle_name: true,
            last_name: true,
            admission_number: true,
            email: true,
            phone: true,

            invoice: {
              where: {
                school_id: schoolIdBigInt,

                pending_amount: {
                  gt: 0
                }
              },

              select: {
                id: true,
                pending_amount: true
              }
            },

            admission: {
              where: {
                school_id: schoolIdBigInt
              },

              orderBy: {
                admission_date: 'desc'
              },

              take: 1,

              select: {
                school_class: {
                  select: {
                    class_name: true
                  }
                }
              }
            }
          }
        });

      const outstanding = students
        .map((student) => {
          const pendingAmount =
            student.invoice.reduce(
              (sum, invoice) =>
                sum +
                Number(
                  invoice.pending_amount
                ),
              0
            );

          const studentName = [
            student.first_name,
            student.middle_name,
            student.last_name
          ]
            .filter(Boolean)
            .join(' ');

          return {
            studentName,

            studentId:
              student.id.toString(),

            admissionNumber:
              student.admission_number,

            className:
              student.admission[0]
                ?.school_class?.class_name ??
              'N/A',

            pendingAmount,

            invoiceCount:
              student.invoice.length,

            studentEmail:
              student.email,

            studentPhone:
              student.phone
          };
        })
        .filter(
          (student) =>
            student.pendingAmount > 0
        )
        .sort(
          (a, b) =>
            b.pendingAmount -
            a.pendingAmount
        )
        .slice(0, limit);

      logger.info(
        `✅ Outstanding balances fetched: ${outstanding.length} students`
      );

      return outstanding;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching outstanding balances for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get refund statistics.
   *
   * Uses the current refund_request model.
   */
  static async getRefundStats(
    schoolId: string
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `💰 Fetching refund statistics for school ${schoolId}`
      );

      const distribution =
        await prisma.refund_request.groupBy({
          by: ['status'],

          _count: {
            id: true
          },

          _sum: {
            amount: true
          },

          where: {
            school_id: schoolIdBigInt
          }
        });

      const formattedStats =
        distribution.map((item) => ({
          status:
            item.status ?? 'unknown',

          count:
            item._count.id,

          totalAmount:
            Number(item._sum.amount ?? 0)
        }));

      logger.info(
        `✅ Refund statistics fetched for school ${schoolId}`
      );

      return formattedStats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching refund statistics for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get daily collection trend.
   */
  static async getDailyCollectionTrend(
    schoolId: string,
    days: number = 30
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `📅 Fetching daily collection trend for school ${schoolId}, last ${days} days`
      );

      const dailyData = await prisma.$queryRaw<
        Array<{
          transaction_date: Date;
          transaction_count: number;
          daily_collection: number;
          avg_transaction_amount: number;
        }>
      >`
        SELECT
          DATE(p.payment_date)::DATE AS transaction_date,

          COUNT(p.id)::INT AS transaction_count,

          COALESCE(
            SUM(p.amount),
            0
          )::FLOAT AS daily_collection,

          COALESCE(
            AVG(p.amount),
            0
          )::FLOAT AS avg_transaction_amount

        FROM payment p

        WHERE p.school_id = ${schoolIdBigInt}

          AND p.payment_date >=
            CURRENT_DATE -
            (${days} * INTERVAL '1 day')

          AND p.status <> 'cancelled'

        GROUP BY
          DATE(p.payment_date)

        ORDER BY
          DATE(p.payment_date) DESC
      `;

      logger.info(
        `✅ Daily collection trend fetched: ${dailyData.length} days`
      );

      return dailyData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching daily collection trend for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Get overdue invoices.
   */
  static async getOverdueInvoices(
    schoolId: string
  ) {
    try {
      const schoolIdBigInt = this.getSchoolId(schoolId);

      logger.info(
        `⚠️ Fetching overdue invoices for school ${schoolId}`
      );

      const now = new Date();

      const overdueInvoices =
        await prisma.invoice.findMany({
          where: {
            school_id: schoolIdBigInt,

            due_date: {
              lt: now
            },

            pending_amount: {
              gt: 0
            }
          },

          include: {
            student: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                admission_number: true,
                phone: true,
                email: true
              }
            }
          },

          orderBy: {
            due_date: 'asc'
          }
        });

      const formattedInvoices =
        overdueInvoices.map((invoice) => {
          const studentName = [
            invoice.student.first_name,
            invoice.student.middle_name,
            invoice.student.last_name
          ]
            .filter(Boolean)
            .join(' ');

          const dueDate =
            invoice.due_date;

          const daysOverdue =
            Math.max(
              0,
              Math.floor(
                (Date.now() -
                  dueDate.getTime()) /
                  (1000 *
                    60 *
                    60 *
                    24)
              )
            );

          return {
            invoiceId:
              invoice.id.toString(),

            invoiceNumber:
              invoice.invoice_number,

            studentName,

            studentId:
              invoice.student.id.toString(),

            admissionNumber:
              invoice.student.admission_number,

            studentPhone:
              invoice.student.phone,

            studentEmail:
              invoice.student.email,

            feeType:
              'Fee Invoice',

            totalAmount:
              Number(invoice.total_amount),

            amountPaid:
              Number(
                invoice.paid_amount ?? 0
              ),

            amountPending:
              Number(
                invoice.pending_amount
              ),

            dueDate,

            daysOverdue
          };
        });

      logger.info(
        `✅ Overdue invoices fetched: ${formattedInvoices.length}`
      );

      return formattedInvoices;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        `Error fetching overdue invoices for school ${schoolId}: ${errorMessage}`
      );

      throw error;
    }
  }
}

export default DashboardService;