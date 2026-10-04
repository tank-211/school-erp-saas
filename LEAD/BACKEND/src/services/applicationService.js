import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

    export const getApplicationsService = async (school_id) => {

    const applications = await prisma.application.findMany({
        where: {
        school_id
        },
        include: {
        lead: true,
        app_user: { select: { id: true, name: true, email: true } },
        application_documents: true,
        application_student_info: true,
        application_parent_info: true,
        application_academic_info: true
        },
        orderBy: {
        created_at: "desc"
        }
    });

    // Fees: an application becomes an admission (and a student); that
    // student's invoices hold what was billed and paid
    const appIds = applications.map((a) => a.id);
    const admissions = appIds.length
      ? await prisma.admission.findMany({
          where: { school_id, application_id: { in: appIds } },
          select: { application_id: true, student_id: true },
        })
      : [];
    const studentByApp = new Map(admissions.map((a) => [String(a.application_id), a.student_id]));
    const studentIds = [...new Set(admissions.map((a) => String(a.student_id)))].map(BigInt);
    const invoices = studentIds.length
      ? await prisma.invoice.findMany({
          where: { school_id, student_id: { in: studentIds }, status: { not: "cancelled" } },
          select: { student_id: true, total_amount: true, paid_amount: true },
        })
      : [];
    const feesByStudent = new Map();
    for (const inv of invoices) {
      const f = feesByStudent.get(String(inv.student_id)) || { total: 0, paid: 0 };
      f.total += Math.round(Number(inv.total_amount || 0) * 100);
      f.paid += Math.round(Number(inv.paid_amount || 0) * 100);
      feesByStudent.set(String(inv.student_id), f);
    }
    const feeFor = (app) => {
      const studentId = studentByApp.get(String(app.id));
      const f = studentId ? feesByStudent.get(String(studentId)) : null;
      if (!f || !f.total) return { feeStatus: "Not Invoiced", feePaid: 0, feeTotal: 0 };
      return {
        feeStatus: f.paid >= f.total ? "Paid" : f.paid > 0 ? "Partly Paid" : "Not Paid",
        feePaid: f.paid / 100,
        feeTotal: f.total / 100,
      };
    };

    // Campus visits of the applicant's lead: the next one, else the latest
    const leadIds = [...new Set(applications.map((a) => a.lead_id).filter(Boolean).map(String))].map(BigInt);
    const visits = leadIds.length
      ? await prisma.campus_visit.findMany({
          where: { school_id, lead_id: { in: leadIds }, status: { not: "cancelled" } },
          select: { lead_id: true, visit_date: true },
          orderBy: { visit_date: "asc" },
        })
      : [];
    const today = new Date(new Date().toDateString());
    const visitFor = (app) => {
      const mine = visits.filter((v) => String(v.lead_id) === String(app.lead_id));
      const next = mine.find((v) => new Date(v.visit_date) >= today) || mine[mine.length - 1];
      return next ? new Date(next.visit_date).toLocaleDateString("en-IN") : null;
    };

    return applications.map(app => ({
        id: app.id.toString(),

        // ADMISSION can create applications without a lead: fall back to the
        // application's own student info
        name:
        (app.lead
          ? `${app.lead.first_name} ${app.lead.last_name ?? ""}`
          : `${app.application_student_info?.first_name ?? ""} ${app.application_student_info?.last_name ?? ""}`
        ).trim() || "Unnamed applicant",

        appId:
        app.application_number,

        grade:
        app.lead?.desired_class || app.application_academic_info?.desired_class || "N/A",

        parent:
        app.application_parent_info?.primary_contact_person ||
        app.application_parent_info?.father_name ||
        app.application_parent_info?.mother_name ||
        "N/A",

        submitted:
        new Date(app.created_at).toLocaleDateString(),

        interview: visitFor(app),

        status:
            app.status === "draft"
          ? "Draft"
          : app.status === "approved"
          ? "Approved"
          : app.status === "rejected"
          ? "Rejected"
          : app.status === "waitlisted"
          ? "Waitlisted"
          : app.status === "under_review"
          ? "Under Review"
          : app.status,

        ...feeFor(app),

        counselor:
        app.app_user?.name || "Unassigned" ,

        docs:
        app.application_documents.map(doc => ({
            name: doc.document_type,
            status: doc.verification_status
        }))
    }));
    };

export const getApplicationStatsService = async (school_id) => {
  const [
    total,
    draft,
    underReview,
    approved,
    rejected,
    waitlisted
  ] = await Promise.all([
    prisma.application.count({ where: { school_id } }),
    prisma.application.count({
      where: { school_id, status: "draft" }
    }),
    prisma.application.count({
      where: { school_id, status: "under_review" }
    }),
    prisma.application.count({
      where: { school_id, status: "approved" }
    }),
    prisma.application.count({
      where: { school_id, status: "rejected" }
    }),
    // "waitlisted" is not an allowed application status in the database
    // (application_status_check), so no application can be waitlisted yet.
    Promise.resolve(0),
  ]);

  return {
    total,
    draft,
    underReview,
    approved,
    rejected,
    waitlisted
  };
};
export const createApplicationFromLeadService = async (
  lead_id,
  school_id,
  userId
) => {
  const lead = await prisma.lead.findFirst({
    where: {
      id: BigInt(lead_id),
      school_id
    }
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  const existing = await prisma.application.findFirst({
    where: {
      lead_id: lead.id
    }
  });

  if (existing) {
    throw new Error("Application already exists for this lead.");
  }

  const application = await prisma.application.create({
    data: {
      application_number: `APP-${Date.now()}`,
      lead_id: lead.id,
      school_id,
      academic_year_id: lead.academic_year_id,
      assigned_to: BigInt(userId),
      status: "draft",
    }
  });

  return JSON.parse(
    JSON.stringify(application, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
};

export const getApplicationByIdService = async (
  application_id,
  school_id
) => {

  const application = await prisma.application.findFirst({
    where: {
      id: BigInt(application_id),
      school_id
    },
    include: {
      lead: true,
      app_user: { select: { id: true, name: true, email: true } },
      application_documents: {
        orderBy: {
          uploaded_at: "desc"
        }
      },
      application_student_info: true,
      application_parent_info: true,
      application_academic_info: true
    }
  });

  return JSON.parse(
    JSON.stringify(application, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
};

export const addDocumentService = async (
  application_id,
  document
) => {

  console.log("Original Path:", document.filePath);

  console.log(
    "Relative Path:",
    document.filePath
      .replace(process.cwd(), "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
  );

  return prisma.applicationDocument.create({
    data: {
      application_id: BigInt(application_id),

      document_type: document.documentType,

      file_name: document.fileName,

      file_path: document.filePath
        .replace(process.cwd(), "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, ""),

      file_size: document.fileSize,

      mime_type: document.mimeType,

      uploaded_by: BigInt(document.uploadedBy),

      verification_status: "pending"
    }
  });

};

export const verifyDocumentService = async (
  documentId
) => {

  return prisma.applicationDocument.update({
    where: {
      id: BigInt(documentId)
    },
    data: {
      verification_status: "Verified"
    }
  });

};
// Allowed by the database constraint application_status_check (verified in Neon).
export const APPLICATION_STATUSES = [
  "draft", "in_progress", "documents_pending", "submitted", "under_review",
  "approved", "rejected", "admission_started", "admission_completed"
];

export const updateApplicationStatusService =
async (id, status) => {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!APPLICATION_STATUSES.includes(normalized)) {
    const error = new Error(`Status must be one of: ${APPLICATION_STATUSES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  return prisma.application.update({
    where: {
      id: BigInt(id)
    },
    data: {
      status: normalized,
      updated_at: new Date()
    }
  });
};

export const deleteDocumentService = async (documentId) => {

  const document =
    await prisma.applicationDocument.findUnique({
      where: {
        id: BigInt(documentId)
      }
    });

  if (!document) {
    throw new Error("Document not found.");
  }

  if (
    document.file_path &&
    fs.existsSync(document.file_path)
  ) {
    fs.unlinkSync(document.file_path);
  }

  await prisma.applicationDocument.delete({
    where: {
      id: BigInt(documentId)
    }
  });

};

export const updateStudentInfoService = async (
  applicationId,
  data
) => {

  // Only known student fields; never let the body set application_id or ids
  const STUDENT_FIELDS = [
    "first_name", "middle_name", "last_name", "gender", "email", "phone",
    "address", "city", "state", "postal_code", "country", "blood_group",
    "aadhar_number"
  ];
  const payload = {};
  for (const field of STUDENT_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field];
  }
  payload.date_of_birth = data.date_of_birth
    ? new Date(data.date_of_birth)
    : null;

  return await prisma.application_student_info.upsert({
    where: {
      application_id: BigInt(applicationId)
    },

    update: payload,

    create: {
      application_id: BigInt(applicationId),
      ...payload
    }
  });

};

export const updateParentInfoService = async (
  applicationId,
  data
) => {

  return await prisma.application_parent_info.upsert({

    where: {
      application_id: BigInt(applicationId)
    },

    update: {
      guardian_name: data.guardian_name,
      guardian_relation: data.guardian_relation,
      guardian_phone: data.guardian_phone,
      guardian_email: data.guardian_email,
      income_range: data.income_range,
      address: data.address,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
      primary_contact_person: data.primary_contact_person,
      primary_contact_relation: data.primary_contact_relation,
      primary_contact_phone: data.primary_contact_phone
    },

    create: {
      application_id: BigInt(applicationId),

      guardian_name: data.guardian_name,
      guardian_relation: data.guardian_relation,
      guardian_phone: data.guardian_phone,
      guardian_email: data.guardian_email,
      income_range: data.income_range,
      address: data.address,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
      primary_contact_person: data.primary_contact_person,
      primary_contact_relation: data.primary_contact_relation,
      primary_contact_phone: data.primary_contact_phone
    }

  });

};