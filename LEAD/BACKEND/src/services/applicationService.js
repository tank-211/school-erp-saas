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
        app_user: true,
        application_documents: true
        },
        orderBy: {
        created_at: "desc"
        }
    });

    return applications.map(app => ({
        id: app.id.toString(),

        name:
        `${app.lead.first_name} ${app.lead.last_name ?? ""}`,

        appId:
        app.application_number,

        grade:
        app.lead.desired_class || "N/A",

        parent:"N/A",

        submitted:
        new Date(app.created_at).toLocaleDateString(),

        interview: null,

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

        feeStatus: "Not Paid",

        feePaid: 0,

        feeTotal:0,

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
      where: { school_id, status: "waitlisted" }
    }),
    prisma.application.count({
      where: { school_id, status: "Rejected" }
    }),
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
      app_user: true,
      application_documents: {
        orderBy: {
          uploaded_at: "desc"
        }
      },
      application_student_info: true,
      application_parent_info: true
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
export const updateApplicationStatusService =
async (id, status) => {

  return prisma.application.update({
    where: {
      id: BigInt(id)
    },
    data: {
      status
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

  const payload = {
    ...data,

    date_of_birth: data.date_of_birth
      ? new Date(data.date_of_birth)
      : null
  };

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