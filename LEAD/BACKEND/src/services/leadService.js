import { PrismaClient } from "@prisma/client";
import AppError from "../utils/AppError.js";

const prisma = new PrismaClient();

// Lead statuses the LEAD backend and UI use. The database does not constrain
// lead.follow_up_status (verified in Neon), so this list is the only guard.
// Covers the backend's words and the UI's filter words (new/qualified/converted/lost).
export const LEAD_STATUSES = [
  "new", "pending", "contacted", "interested", "qualified",
  "converted", "admitted", "inactive", "lost"
];
const allowedStatus = LEAD_STATUSES;

// Status words that mean the same stage (the UI and backend grew different
// vocabularies). Stats and the pipeline count them together.
export const STATUS_GROUPS = {
  new: ["new", "pending"],
  contacted: ["contacted"],
  qualified: ["interested", "qualified"],
  admitted: ["admitted", "converted"],
  lost: ["inactive", "lost", "not-interested"],
};

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

  if (status) {
    // Filter by the whole stage, e.g. "lost" also finds "inactive" leads
    const group = Object.values(STATUS_GROUPS).find((g) => g.includes(status));
    where.follow_up_status = group ? { in: group } : status;
  }
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
/* =========================
   BULK CREATE
   rows: [{ studentFirstName, studentLastName, fatherPhone, fatherEmail,
            grade, source, status }]
   Everything is created in the caller's school and its active academic year.
========================= */
const bulkCreateLeadsService = async (rows, schoolId, actorId) => {
  if (!rows.length) {
    return { count: 0 };
  }

  const sid = BigInt(schoolId);
  const academicYear = await prisma.academic_year.findFirst({
    where: { school_id: sid, status: "active" },
    select: { id: true },
  });

  if (!academicYear) {
    throw new AppError("No active academic year found for this school", 400);
  }

  const data = rows.map((row) => ({
    school_id: sid,
    academic_year_id: academicYear.id,
    first_name: row.studentFirstName,
    last_name: row.studentLastName || null,
    phone: row.fatherPhone,
    email: row.fatherEmail || null,
    desired_class: row.grade || null,
    source: row.source || "bulk_upload",
    follow_up_status: allowedStatus.includes(row.status) ? row.status : "new",
    assigned_to: String(actorId),
    created_by: String(actorId),
  }));

  return prisma.lead.createMany({ data });
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
            follow_up_status: { in: STATUS_GROUPS.new }
          }
        }),

        prisma.lead.count({
          where: {
            school_id: sid,
            follow_up_status: { in: STATUS_GROUPS.contacted }
          }
        }),

        prisma.lead.count({
          where: {
            school_id: sid,
            follow_up_status: { in: STATUS_GROUPS.admitted }
          }
        }),

        prisma.lead.count({
          where: {
            school_id: sid,
            follow_up_status: { in: STATUS_GROUPS.lost }
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
  assigneeId,
  schoolId,
  actorId
) => {
  const isId = (v) => /^\d+$/.test(String(v ?? ""));
  if (!isId(leadId) || !isId(assigneeId)) {
    throw new AppError("Valid lead and assignee are required", 400);
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: BigInt(leadId),
      school_id: BigInt(schoolId)
    }
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  // Assignee must be an active user of the same school
  const user = await prisma.user.findFirst({
    where: {
      id: BigInt(assigneeId),
      school_id: BigInt(schoolId),
      status: "active"
    }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updatedLead = await prisma.lead.update({
    where: {
      id: lead.id
    },
    data: {
      assigned_to: String(user.id),
      updated_at: new Date()
    }
  });

  await prisma.activity.create({
    data: {
      lead_id: updatedLead.id,
      activity_type: "LEAD_ASSIGNED",
      notes: `Assigned to ${user.name}`,
      created_by: BigInt(actorId)
    }
  });

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