import { PrismaClient } from "@prisma/client";
import AppError from "../utils/AppError.js";

const prisma = new PrismaClient();

const allowedStatus = ["new", "pending", "contacted", "inactive", "admitted"];

/* =========================
   CREATE LEAD
========================= */
 const createLeadService = async (data, userId) => {
  const first_name = data.studentFirstName?.trim();
  const last_name = data.studentLastName?.trim();
  const fatherName = data.fatherName || "Unknown";
  const phone = data.fatherPhone?.trim();
  console.log("BODY RECEIVED:", data);
  console.log("FIRST NAME:", first_name);
  console.log("LAST NAME:", last_name);

  if (!first_name || !last_name) {
    throw new AppError("Student name is required", 400);
  }

  if (!fatherName || !phone) {
    throw new AppError("Father details are required", 400);
  }

  const academicYear = await prisma.academic_year.findFirst({
    where: {
      school_id: BigInt(data.schoolId),
      status: "active"
    }
  });

  if (!academicYear) {
    throw new AppError("No active academic year found", 400);
  }

  const lead = await prisma.lead.create({
  data: {
      school: {
        connect: {
          id: BigInt(data.schoolId)
        }
      },

      academic_year: {
        connect: {
          id: academicYear.id
        }
      },

      first_name: data.studentFirstName,
      last_name: data.studentLastName,
      phone: data.fatherPhone,
      email: data.fatherEmail,
      desired_class: data.grade,
      source: data.source,
      notes: data.notes,
      follow_up_status:
        allowedStatus.includes(data.status) ? data.status : "pending",
      assigned_to: String(data.assignedTo || userId),
      created_by: String(userId)
    }
});

  // ✅ ONLY PLACE THIS EXISTS
  const settings = await prisma.settings.findFirst({
     where: { schoolId: Number(data.schoolId)} 
  });
    console.log("🔥 SETTINGS CHECK:", settings);
  if (settings?.newLead) {
      console.log("🔥 CREATING NOTIFICATION...");
    await prisma.notification.create({
      
      data: {
        userId: Number(userId),
        schoolId: Number(data.schoolId),
        title: "New Lead Assigned",
        message: `Lead ${lead.first_name} ${lead.last_name} created`,
        isRead: false
      }
    });
  }

  await prisma.activity.create({
    data: {
      lead_id: lead.id,
      activity_type: "LEAD_CREATED",
      created_by: BigInt(userId)
    }
  });

  return lead;

};



/* =========================
   GET ALL LEADS
========================= */
 const getAllLeadsService = async (filters, schoolId) => {
  const { page = 1, limit = 6, status, source, counselor, date, search } = filters;

  const where = { school_id: BigInt(schoolId) };

  if (status) where.follow_up_status = status;
  if (source) where.source = source;
  if (counselor) where.assigned_to = counselor;
  if (date === "This Week") where.created_at = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  if (date === "This Month") where.created_at = { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) };

  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: "insensitive" } },
      { last_name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const skip = (page - 1) * limit;

  const total = await prisma.lead.count({ where });

  const leads = await prisma.lead.findMany({
    where,
    skip: Number(skip),
    take: Number(limit),
    orderBy: { created_at: "desc" },
  });

  return {
    leads,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* =========================
   GET LEAD BY ID
========================= */
 const getLeadByIdService = async (id, schoolId) => {
  const lead = await prisma.lead.findFirst({
    where: { id: BigInt(id) ,
    school_id: BigInt(schoolId)
    }
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  return lead;
};

/* =========================
   UPDATE LEAD
========================= */
 const updateLeadService = async (id, data, schoolId) => {
  const existingLead = await prisma.lead.findFirst({
    where: {
      id: BigInt(id),
      school_id: BigInt(schoolId)
    }
  });

  if (!existingLead) {
    throw new AppError("Lead not found", 404);
  }

  const updatedLead = await prisma.lead.update({
    
    where: { id: BigInt(id) },
    data: {
      ...(data.studentFirstName && {
          first_name: data.studentFirstName.trim()
      }),

      ...(data.studentLastName && {
          last_name: data.studentLastName.trim()
      }),

      ...(data.fatherPhone && {
          phone: data.fatherPhone.trim()
      }),

      ...(data.fatherEmail && {
          email: data.fatherEmail
      }),

      ...(data.grade && {
          desired_class: data.grade
      }),

      ...(data.status && {
          follow_up_status: data.status
      }),
    },
  });
  await prisma.activity.create({
    data: {
      lead_id: updatedLead.id,
      activity_type: "LEAD_UPDATED",
      created_by: BigInt(existingLead.assigned_to)
    }
  });

  return updatedLead;
};

/* =========================
   DELETE LEAD
========================= */
 const deleteLeadService = async (id, schoolId) => {
  const existingLead = await prisma.lead.findFirst({
    where: {
      id: BigInt(id),
      school_id: BigInt(schoolId)
    }
  });

  if (!existingLead) {
    throw new AppError("Lead not found", 404);
  }

  await prisma.lead.delete({
    where: { id: BigInt(id) },
  });

  return { message: "Lead deleted successfully" };
};

/* =========================
   BULK CREATE
========================= */
     const bulkCreateLeadsService = async (leads) => {
      if (!leads.length) {
        return { count: 0 };
      }

      const result = await prisma.lead.createMany({
        data: leads,
        skipDuplicates: true, // 🔥 important
      });

      return result; // { count: number }
    };
 const getLeadStatsService = async (schoolId) => {
    const sid = BigInt(schoolId);

    const [total, pending, contacted, admitted, inactive] =
      await Promise.all([
        prisma.lead.count({
          where: {
            school_id: sid
          }
        }),

        prisma.lead.count({
          where: {
            school_id: sid,
            follow_up_status: "pending"
          }
        }),

        prisma.lead.count({
          where: {
            school_id: sid,
            follow_up_status: "contacted"
          }
        }),

        prisma.lead.count({
          where: {
            school_id: sid,
            follow_up_status: "admitted"
          }
        }),

        prisma.lead.count({
          where: {
            school_id: sid,
            follow_up_status: "inactive"
          }
        })
      ]);

    return {
      total,
      pending,
      contacted,
      admitted,
      inactive
    };
  };

export const getLeadDetailsService = async (leadId, schoolId) => {
  return prisma.lead.findFirst({
    where: {
      id: BigInt(leadId),
      school_id: BigInt(schoolId),
    },
    include: {
      application: true,
      tasks: true,
      lead_activity: true,
    },
  });
};

export const assignLeadService = async (
  leadId,
  userId,
  schoolId
) => {

  const lead = await prisma.lead.findFirst({
    where: {
      id: BigInt(leadId),
      school_id: BigInt(schoolId)
    }
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  const user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId),
      school_id: BigInt(schoolId)
    }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

const updatedLead = await prisma.lead.update({
  where: {
    id: BigInt(leadId)
  },
  data: {
    assigned_to: String(data.assignedTo || userId),
  }
});

console.log("🔥 CREATING LEAD_ASSIGNED ACTIVITY");

await prisma.activity.create({
  data: {
    lead_id: updatedLead.id,
    activity_type: "LEAD_ASSIGNED",
    created_by: BigInt(userId)
  }
});

console.log("✅ ACTIVITY CREATED");

return updatedLead;
};

export {
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  bulkCreateLeadsService,
  getLeadStatsService
};