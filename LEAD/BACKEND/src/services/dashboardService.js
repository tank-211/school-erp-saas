import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
console.log(Object.keys(prisma));
export const getDashboard = async (req, res) => {
  console.log("USING UPDATED DASHBOARD CONTROLLER");
  console.log("🔥 DASHBOARD API HIT");
  try {
    const schoolId = BigInt(req.user.schoolId);

    const stats = await getStatsService(BigInt(req.user.schoolId));
    console.log("✅ Stats OK");

    const enrollmentTrend = await getEnrollmentTrendService(BigInt(req.user.schoolId));
    console.log("✅ Enrollment Trend OK");

    const statusDistribution = await getStatusDistributionService(BigInt(req.user.schoolId));
    console.log("✅ Status Distribution OK");

    const gradeDistribution = await getGradeDistributionService(BigInt(req.user.schoolId));
    console.log("✅ Grade Distribution OK");

    const todayOverview = await getTodayOverviewService(BigInt(req.user.schoolId));
    console.log("✅ Today Overview OK");

    const recentActivities = await getRecentActivitiesService(BigInt(req.user.schoolId));
    console.log("✅ Recent Activities OK");

    console.log("🔥 RECENT ACTIVITIES RESULT:", recentActivities);
    
    res.json(
        JSON.parse(
          JSON.stringify(
            {
              success: true,
              data: {
                stats,
                enrollmentTrend,
                statusDistribution,
                gradeDistribution,
                todayOverview,
                recentActivities
              }
            },
            (key, value) =>
              typeof value === "bigint"
                ? Number(value)
                : value
          )
        )
      );

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getStatsService = async (schoolId) => {
  const [
    totalLeads,
    newLeads,
    qualifiedLeads,
    lostLeads,
    convertedLeads
  ] = await Promise.all([
      prisma.lead.count({
        where: { school_id: schoolId }
      }),

      prisma.lead.count({
        where: {
          school_id: schoolId,
          follow_up_status: "new"
        }
      }),

      prisma.lead.count({
        where: {
          school_id: schoolId,
          follow_up_status: "contacted"
        }
      }),

      prisma.lead.count({
        where: {
          school_id: schoolId,
          follow_up_status: "inactive"
        }
      }),

      prisma.lead.count({
        where: {
          school_id: schoolId,
          follow_up_status: "admitted"
        }
      })
  ]);

  const activeLeads = newLeads + qualifiedLeads;

  const conversionRate =
    totalLeads > 0
      ? ((convertedLeads / totalLeads) * 100).toFixed(1)
      : 0;

  return {
    totalInquiries: {
      value: totalLeads,
      delta: totalLeads
    },
    conversionRate: {
      value: `${conversionRate}%`,
      delta: convertedLeads
    },
    activeLeads: {
      value: activeLeads,
      delta: activeLeads
    },
    enrolledStudents: {
      value: convertedLeads,
      delta: convertedLeads
    }
  };
};

export const getEnrollmentTrendService = async (schoolId) => {
  const leads = await prisma.lead.findMany({
    where: { school_id: schoolId },
    select: { created_at: true, follow_up_status: true },
  });

  console.log("LEADS FROM DB:", leads);

  const trend = {};

  leads.forEach((lead) => {
    const month = new Date(lead.created_at).toLocaleString("default", {
      month: "short",
    });

    if (!trend[month]) {
      trend[month] = { inquiries: 0, enrollments: 0 };
    }

    trend[month].inquiries++;

    if (lead.follow_up_status === "admitted") {
      trend[month].enrollments++;
    }
  });
  
  const monthOrder = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  return Object.entries(trend)
    .map(([month, data]) => ({
      month,
      inquiries: data.inquiries,
      enrollments: data.enrollments,
    }))
    .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
};

export const getStatusDistributionService = async (schoolId) => {
  const leads = await prisma.lead.findMany({
    where: {
      school_id: schoolId
    },
    select: {
      id: true,
      follow_up_status: true
    }
  });

  console.log("LEADS:", leads);

  const statuses = await prisma.lead.groupBy({
    by: ["follow_up_status"],

    where: {
      school_id: schoolId
    },

    _count: {
      follow_up_status: true
    },
  });

  const allStatuses = ["new", "contacted", "inactive", "admitted"];

  const map = {};
  statuses.forEach((s) => {
    map[s.follow_up_status] =
      s._count.follow_up_status;
  });

  return allStatuses.map((status) => ({
    name: status,
    value: map[status] || 0,
  }));
};
  

export const getTodayOverviewService = async (schoolId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayLeads, todayActivities, todayCommunications] =
    await Promise.all([
      prisma.lead.count({
        where: {
          school_id: schoolId,
          created_at: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      prisma.activity.count({
        where: {
          created_at: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      prisma.communication.count({
        where: {
          created_at: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    ]);

  return {
    callsMade: todayActivities,
    emailsSent: todayCommunications,
    toursScheduled: todayLeads
  };
};

export const getGradeDistributionService = async (schoolId) => {
  const grades = await prisma.lead.groupBy({
    by: ["desired_class"],
    where: {
      school_id: schoolId,
      desired_class: {
        not: null,
      },
    },
    _count: {
      desired_class: true,
    },
  });

  return grades.map((g) => ({
    grade: g.desired_class,
    inquiries: g._count.desired_class,
  }));
};

export const getRecentActivitiesService = async (schoolId) => {
  console.log("🔥 RECENT ACTIVITY SERVICE CALLED");

  const activities = await prisma.activity.findMany({
  where: {
    lead: {
      school_id: schoolId
    }
  },
  take: 10,
  orderBy: {
    created_at: "desc",
  },
  select: {
    id: true,
    activity_type: true,
    notes: true,
    outcome: true,
    created_at: true,
    lead: {
      select: {
        first_name: true,
        last_name: true
      }
    },
    app_user: {
      select: {
        name: true
      }
    }
  }
});

return activities;
};

export const serializeBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );