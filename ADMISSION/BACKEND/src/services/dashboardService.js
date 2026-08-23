import prisma from '../../src/lib/prisma.js';

const safeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const getLastSixMonths = () => {
  const months = [];

  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    months.push(date);
  }

  return months;
};

const dashboardService = {
  async getTotalInquiries(schoolId) {
    try {
      const total = await prisma.lead.count({
        where: {
          school_id: BigInt(schoolId),
        },
      });

      console.log('[Dashboard] getTotalInquiries:', total);

      return safeNumber(total);
    } catch (err) {
      console.error('Error in getTotalInquiries:', err);
      throw err;
    }
  },

  async getConversionRate(schoolId) {
    try {
      const schoolIdBigInt = BigInt(schoolId);

      const totalLeads = await prisma.lead.count({
        where: {
          school_id: schoolIdBigInt,
        },
      });

      if (totalLeads === 0) {
        console.log('[Dashboard] getConversionRate:', 0);
        return 0;
      }

      const convertedLeads =
        await prisma.application.findMany({
          where: {
            school_id: schoolIdBigInt,
            lead_id: {
              not: null,
            },
          },
          select: {
            lead_id: true,
          },
          distinct: ['lead_id'],
        });

      const rate =
        (convertedLeads.length / totalLeads) * 100;

      const roundedRate =
        Math.round(rate * 100) / 100;

      console.log(
        '[Dashboard] getConversionRate:',
        roundedRate
      );

      return safeNumber(roundedRate);
    } catch (err) {
      console.error('Error in getConversionRate:', err);
      throw err;
    }
  },

  async getActiveLeads(schoolId) {
    try {
      const total = await prisma.lead.count({
        where: {
          school_id: BigInt(schoolId),
          follow_up_status: {
            in: [
              'pending',
              'contacted',
              'interested',
            ],
          },
        },
      });

      console.log('[Dashboard] getActiveLeads:', total);

      return safeNumber(total);
    } catch (err) {
      console.error('Error in getActiveLeads:', err);
      throw err;
    }
  },

  async getEnrolledStudents(schoolId) {
    try {
      const total = await prisma.application.count({
        where: {
          school_id: BigInt(schoolId),
          status: 'approved',
        },
      });

      console.log(
        '[Dashboard] getEnrolledStudents:',
        total
      );

      return safeNumber(total);
    } catch (err) {
      console.error(
        'Error in getEnrolledStudents:',
        err
      );
      throw err;
    }
  },

  async getPendingApplications(schoolId) {
    try {
      const total = await prisma.application.count({
        where: {
          school_id: BigInt(schoolId),
          status: 'in_progress',
        },
      });

      console.log(
        '[Dashboard] getPendingApplications:',
        total
      );

      return safeNumber(total);
    } catch (err) {
      console.error(
        'Error in getPendingApplications:',
        err
      );
      throw err;
    }
  },

  async getOffersSent(schoolId) {
    try {
      const total = await prisma.application.count({
        where: {
          school_id: BigInt(schoolId),
          status: 'approved',
        },
      });

      console.log('[Dashboard] getOffersSent:', total);

      return safeNumber(total);
    } catch (err) {
      console.error('Error in getOffersSent:', err);
      throw err;
    }
  },

  async getFeesCollected(schoolId) {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          school_id: BigInt(schoolId),
          status: 'successful',
        },
        select: {
          amount: true,
        },
      });

      const total = payments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

      console.log(
        '[Dashboard] getFeesCollected:',
        total
      );

      return safeNumber(total);
    } catch (err) {
      console.error(
        'Error in getFeesCollected:',
        err
      );
      throw err;
    }
  },

  async getMonthlyTrend(schoolId) {
    try {
      const schoolIdBigInt = BigInt(schoolId);
      const months = getLastSixMonths();

      const firstMonth = startOfMonth(months[0]);
      const nextMonth = new Date(
        months[5].getFullYear(),
        months[5].getMonth() + 1,
        1
      );

      const [leads, admissions] =
        await Promise.all([
          prisma.lead.findMany({
            where: {
              school_id: schoolIdBigInt,
              created_at: {
                gte: firstMonth,
                lt: nextMonth,
              },
            },
            select: {
              created_at: true,
            },
          }),

          prisma.admission.findMany({
            where: {
              school_id: schoolIdBigInt,
              admission_date: {
                gte: firstMonth,
                lt: nextMonth,
              },
              status: 'active',
            },
            select: {
              admission_date: true,
            },
          }),
        ]);

      const rows = months.map((month) => {
        const year = month.getFullYear();
        const monthNumber = month.getMonth();

        const inquiries = leads.filter((lead) => {
          if (!lead.created_at) return false;

          const date = new Date(lead.created_at);

          return (
            date.getFullYear() === year &&
            date.getMonth() === monthNumber
          );
        }).length;

        const enrollments = admissions.filter(
          (admission) => {
            if (!admission.admission_date) {
              return false;
            }

            const date = new Date(
              admission.admission_date
            );

            return (
              date.getFullYear() === year &&
              date.getMonth() === monthNumber
            );
          }
        ).length;

        return {
          month: month.toLocaleString('en-US', {
            month: 'short',
          }),
          inquiries,
          enrollments,
        };
      });

      console.log(
        '[Dashboard] getMonthlyTrend:',
        rows.length,
        'months fetched'
      );

      return rows;
    } catch (err) {
      console.error(
        'Error in getMonthlyTrend:',
        err
      );
      throw err;
    }
  },

  async getGradeDistribution(schoolId) {
    try {
      const schoolIdBigInt = BigInt(schoolId);

      const classes =
        await prisma.school_class.findMany({
          where: {
            school_id: schoolIdBigInt,
          },
          select: {
            id: true,
            class_name: true,
            class_numeric_value: true,
          },
          orderBy: [
            {
              class_numeric_value: 'asc',
            },
            {
              class_name: 'asc',
            },
          ],
        });

      const admissions =
        await prisma.admission.findMany({
          where: {
            school_id: schoolIdBigInt,
            status: {
              in: ['active', 'submitted'],
            },
          },
          select: {
            class_id: true,
          },
        });

      const counts = new Map();

      for (const admission of admissions) {
        const key = String(admission.class_id);

        counts.set(
          key,
          (counts.get(key) || 0) + 1
        );
      }

      return classes
        .filter(
          (schoolClass) =>
            counts.get(String(schoolClass.id)) > 0
        )
        .map((schoolClass) => ({
          label: schoolClass.class_name,
          value:
            counts.get(
              String(schoolClass.id)
            ) || 0,
        }));
    } catch (err) {
      console.error(
        'Error in getGradeDistribution:',
        err
      );
      throw err;
    }
  },

  async getCounselorPerformance(schoolId) {
    try {
      const schoolIdBigInt = BigInt(schoolId);

      const users =
        await prisma.app_user.findMany({
          where: {
            school_id: schoolIdBigInt,
            status: 'active',
            role: {
              in: ['counselor', 'admin'],
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

      const leads =
        await prisma.lead.findMany({
          where: {
            school_id: schoolIdBigInt,
            assigned_to: {
              not: null,
            },
          },
          select: {
            id: true,
            assigned_to: true,
          },
        });

      const applications =
        await prisma.application.findMany({
          where: {
            school_id: schoolIdBigInt,
            lead_id: {
              not: null,
            },
          },
          select: {
            lead_id: true,
          },
          distinct: ['lead_id'],
        });

      const convertedLeadIds = new Set(
        applications
          .map((application) =>
            application.lead_id
              ? String(application.lead_id)
              : null
          )
          .filter(Boolean)
      );

      const performance = users
        .map((user) => {
          const userId = String(user.id);
          const userName = String(user.name || '');

          const assignedLeads = leads.filter(
            (lead) => {
              const assignedTo =
                lead.assigned_to
                  ? String(lead.assigned_to)
                  : '';

              return (
                assignedTo === userId ||
                assignedTo === userName
              );
            }
          );

          const conversions =
            assignedLeads.filter((lead) =>
              convertedLeadIds.has(
                String(lead.id)
              )
            ).length;

          const leadCount =
            assignedLeads.length;

          if (leadCount === 0) {
            return null;
          }

          const pct = Math.round(
            (conversions / leadCount) * 100
          );

          return {
            id: String(user.id),
            name: user.name,
            leads: leadCount,
            conversions,
            pct,
          };
        })
        .filter(Boolean)
        .sort((a, b) =>
          b.pct - a.pct ||
          b.conversions - a.conversions ||
          b.leads - a.leads ||
          String(a.name).localeCompare(
            String(b.name)
          )
        )
        .slice(0, 6);

      return performance;
    } catch (err) {
      console.error(
        'Error in getCounselorPerformance:',
        err
      );
      throw err;
    }
  },
};

export default dashboardService;