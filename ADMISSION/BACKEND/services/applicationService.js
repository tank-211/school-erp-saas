import path from 'path';
import { unlink } from 'fs/promises';
import prisma from '../src/lib/prisma.js';
import {
  VALID_APPLICATION_DOCUMENT_TYPES,
  normalizeApplicationDocumentType,
} from '../utils/applicationDocumentTypes.js';

const APPLICATION_PHOTO_TYPES = ['student_photo', 'passport_photos'];
const APPLICATION_DOCUMENT_TYPES = VALID_APPLICATION_DOCUMENT_TYPES;
const APPLICATION_DOCUMENT_TYPES_SQL = VALID_APPLICATION_DOCUMENT_TYPES
  .map((documentType) => `'${documentType}'`)
  .join(',\n            ');

  const toPublicFilePath = (filePathOrName) => {
    if (!filePathOrName) {
      return null;
    }

    const filePath = String(filePathOrName);
    if (filePath.startsWith('/uploads/')) {
      return filePath;
    }

    return `/uploads/${path.basename(filePath)}`;
  };

const normalizeFileRecord = (record) => {
  if (!record) {
    return null;
  }

  if (typeof record === 'string') {
    const filePath = toPublicFilePath(record);
    return {
      file_name: path.basename(record),
      file_path: filePath,
      file_url: filePath,
      file_size: null,
      mime_type: null,
      created_at: null,
      updated_at: null,
    };
  }

  if (typeof record !== 'object') {
    return null;
  }

  const filePath = record.file_path || record.file_url || record.path || record.url || null;
  const publicPath = toPublicFilePath(filePath || record.file_name);

  return {
    ...record,
    file_name: record.file_name || record.name || (filePath ? path.basename(String(filePath)) : null),
    file_path: publicPath,
    file_url: publicPath,
    document_number: record.document_number || record.documentNumber || null,
  };
};

/**
 * Create a new application from lead
 * POST /api/applications
 */
export const createApplication = async (leadId, academicYearId, schoolId) => {
  try {
    if (!leadId || !academicYearId || !schoolId) {
      throw new Error(
        `Missing required fields: leadId=${leadId}, academicYearId=${academicYearId}, schoolId=${schoolId}`
      );
    }

    console.log(
      `📝 Creating application - Lead: ${leadId}, Year: ${academicYearId}, School: ${schoolId}`
    );

    const result = await prisma.$transaction(async (tx) => {
      // Verify lead exists for this school
      const lead = await tx.lead.findFirst({
        where: {
          id: BigInt(leadId),
          school_id: BigInt(schoolId),
        },
        select: {
          id: true,
        },
      });

      if (!lead) {
        throw new Error(`Lead with ID ${leadId} not found`);
      }

      // Prevent creating a new application when a submitted
      // application already exists for this lead.
      const submittedApplication = await tx.application.findFirst({
        where: {
          school_id: BigInt(schoolId),
          lead_id: BigInt(leadId),
          status: 'submitted',
        },
        select: {
          id: true,
        },
      });

      if (submittedApplication) {
        throw new Error(
          'A submitted application already exists for this lead'
        );
      }

      // Verify academic year exists
      const academicYear = await tx.academic_year.findUnique({
        where: {
          id: BigInt(academicYearId),
        },
        select: {
          id: true,
        },
      });

      if (!academicYear) {
        throw new Error(
          `Academic year with ID ${academicYearId} not found`
        );
      }

      // Verify school exists
      const school = await tx.school.findUnique({
        where: {
          id: BigInt(schoolId),
        },
        select: {
          id: true,
        },
      });

      if (!school) {
        throw new Error(`School with ID ${schoolId} not found`);
      }

      // Generate unique application number
      const appNumber = `APP-${new Date().getFullYear()}-${Date.now()}`;

      // Create application
      const application = await tx.application.create({
        data: {
          school_id: BigInt(schoolId),
          lead_id: BigInt(leadId),
          academic_year_id: BigInt(academicYearId),
          application_number: appNumber,
          current_step: 1,

          // Preserve the existing application's behavior.
          // Do NOT rely on Prisma's "draft" default here.
          status: 'in_progress',
        },
        select: {
          id: true,
          current_step: true,
          status: true,
          created_at: true,
        },
      });

      console.log(
        `✅ Application created with ID: ${application.id.toString()}`
      );

      return application;
    });

    return result;
  } catch (error) {
    console.error('❌ Error creating application:', error.message);
    throw new Error(`Failed to create application: ${error.message}`);
  }
};

export const createApplicationWithoutLead = async (academicYearId, schoolId) => {
  try {
    if (!academicYearId || !schoolId) {
      throw new Error(
        `Missing required fields: academicYearId=${academicYearId}, schoolId=${schoolId}`
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const academicYear = await tx.academic_year.findFirst({
        where: {
          id: BigInt(academicYearId),
          school_id: BigInt(schoolId),
        },
        select: {
          id: true,
        },
      });

      if (!academicYear) {
        throw new Error(
          `Academic year with ID ${academicYearId} not found`
        );
      }

      const appNumber = `APP-${new Date().getFullYear()}-${Date.now()}`;

      return tx.application.create({
        data: {
          school_id: BigInt(schoolId),
          lead_id: null,
          academic_year_id: BigInt(academicYearId),
          application_number: appNumber,
          current_step: 1,
          status: 'in_progress',
        },
        select: {
          id: true,
          lead_id: true,
          current_step: true,
          status: true,
          created_at: true,
        },
      });
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to create application: ${error.message}`);
  }
};

export const getApplicationCounts = async (schoolId) => {
  const where = {
    school_id: BigInt(schoolId),
  };

  const [
    total,
    submitted,
    under_review,
    approved,
    waitlisted,
    draft,
  ] = await Promise.all([
    prisma.application.count({
      where,
    }),

    prisma.application.count({
      where: {
        ...where,
        status: 'submitted',
      },
    }),

    prisma.application.count({
      where: {
        ...where,
        status: 'under_review',
      },
    }),

    prisma.application.count({
      where: {
        ...where,
        status: 'approved',
      },
    }),

    prisma.application.count({
      where: {
        ...where,
        status: 'waitlisted',
      },
    }),

    prisma.application.count({
      where: {
        ...where,
        status: {
          in: ['in_progress', 'draft'],
        },
      },
    }),
  ]);

  return {
    total,
    submitted,
    under_review,
    approved,
    waitlisted,
    draft,
  };
};

export const getDraftApplications = async (schoolId) => {
  const applications = await prisma.application.findMany({
    where: {
      school_id: BigInt(schoolId),
      status: {
        in: ['in_progress', 'draft'],
      },
    },
    orderBy: {
      updated_at: 'desc',
    },
    select: {
      id: true,
      current_step: true,
      updated_at: true,
      status: true,
      application_student_info: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  return applications.map((application) => ({
    id: application.id.toString(),
    student_name: [
      application.application_student_info?.first_name,
      application.application_student_info?.last_name,
    ]
      .filter(Boolean)
      .join(' '),
    current_step: application.current_step,
    updated_at: application.updated_at,
    status: application.status,
  }));
};

export const getApplications = async (schoolId, options = {}) => {
  const limit =
    Number.isInteger(options.limit) && options.limit > 0
      ? options.limit
      : 100;

  const offset =
    Number.isInteger(options.offset) && options.offset >= 0
      ? options.offset
      : 0;

  const applications = await prisma.application.findMany({
    where: {
      school_id: BigInt(schoolId),
    },
    orderBy: {
      updated_at: 'desc',
    },
    skip: offset,
    take: limit,
    select: {
      id: true,
      application_number: true,
      status: true,
      current_step: true,
      updated_at: true,
      submitted_at: true,

      application_student_info: {
        select: {
          first_name: true,
          last_name: true,
        },
      },

      application_parent_info: {
        select: {
          primary_contact_phone: true,
          father_phone: true,
        },
      },

      application_academic_info: {
        select: {
          desired_class: true,
        },
      },

      lead: {
        select: {
          first_name: true,
          last_name: true,
          desired_class: true,
          phone: true,
        },
      },
    },
  });

  return applications.map((application) => {
    const student = application.application_student_info;
    const parent = application.application_parent_info;
    const academic = application.application_academic_info;
    const lead = application.lead;

    return {
      id: application.id.toString(),
      application_number: application.application_number,
      status: application.status,
      current_step: application.current_step,
      updated_at: application.updated_at,
      submitted_at: application.submitted_at,

      student_name: [
        student?.first_name || lead?.first_name,
        student?.last_name || lead?.last_name,
      ]
        .filter(Boolean)
        .join(' '),

      grade:
        academic?.desired_class ||
        lead?.desired_class ||
        null,

      parent_contact:
        parent?.primary_contact_phone ||
        parent?.father_phone ||
        lead?.phone ||
        null,
    };
  });
};

export const searchApplications = async (schoolId, query) => {
  const search = String(query || '').trim();

  if (!search) {
    return [];
  }

  const applications = await prisma.application.findMany({
    where: {
      school_id: BigInt(schoolId),
      OR: [
        {
          application_number: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          application_student_info: {
            is: {
              first_name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          application_student_info: {
            is: {
              last_name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          application_parent_info: {
            is: {
              primary_contact_phone: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          lead: {
            is: {
              first_name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          lead: {
            is: {
              last_name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          lead: {
            is: {
              phone: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    },
    orderBy: {
      updated_at: 'desc',
    },
    take: 50,
    select: {
      id: true,
      application_number: true,
      status: true,
      current_step: true,
      updated_at: true,

      application_student_info: {
        select: {
          first_name: true,
          last_name: true,
        },
      },

      application_parent_info: {
        select: {
          primary_contact_phone: true,
        },
      },

      lead: {
        select: {
          first_name: true,
          last_name: true,
          phone: true,
        },
      },
    },
  });

  return applications.map((application) => ({
    id: application.id.toString(),
    application_number: application.application_number,
    status: application.status,
    current_step: application.current_step,
    updated_at: application.updated_at,

    student_name: [
      application.application_student_info?.first_name ||
        application.lead?.first_name,
      application.application_student_info?.last_name ||
        application.lead?.last_name,
    ]
      .filter(Boolean)
      .join(' '),

    phone:
      application.application_parent_info?.primary_contact_phone ||
      application.lead?.phone ||
      null,
  }));
};

export const getEligibleLeadsForApplication = async (schoolId) => {
  const leads = await prisma.lead.findMany({
    where: {
      school_id: BigInt(schoolId),
      application: {
        none: {},
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return leads.map((lead) => ({
    ...lead,
    id: lead.id.toString(),
    school_id: lead.school_id?.toString(),
    academic_year_id: lead.academic_year_id?.toString(),
  }));
};

export const getApplicationByLeadId = async (leadId, schoolId) => {
  const application = await prisma.application.findFirst({
    where: {
      lead_id: BigInt(leadId),
      school_id: BigInt(schoolId),
    },
    select: {
      id: true,
      lead_id: true,
      application_number: true,
      status: true,
      current_step: true,
      created_at: true,
      submitted_at: true,
      updated_at: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  if (!application) {
    return null;
  }

  return {
    ...application,
    id: application.id.toString(),
    lead_id: application.lead_id?.toString(),
  };
};

export const resumeApplication = async (schoolId, applicationId) => {
  const application = await prisma.application.findFirst({
    where: {
      id: BigInt(applicationId),
      school_id: BigInt(schoolId),
      status: 'in_progress',
    },
    select: {
      id: true,
      school_id: true,
      lead_id: true,
      academic_year_id: true,
      current_step: true,
      status: true,
      updated_at: true,
    },
  });

  if (!application) {
    throw new Error('Draft application not found');
  }

  return application;
};

/**
 * Get application progress
 * GET /api/applications/:id/progress
 */
export const getApplicationProgress = async (applicationId) => {
  try {
    const application = await prisma.application.findUnique({
      where: {
        id: BigInt(applicationId),
      },
      select: {
        id: true,
        current_step: true,
        status: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const currentStep = Number(application.current_step || 1);

    return {
      id: application.id.toString(),
      current_step: currentStep,
      status: application.status,

      steps: {
        student_info: currentStep > 1 ? 'completed' : 'pending',
        parent_info: currentStep > 2 ? 'completed' : 'pending',
        academic_info: currentStep > 3 ? 'completed' : 'pending',
        photos: currentStep > 4 ? 'completed' : 'pending',
        documents: currentStep > 5 ? 'completed' : 'pending',
        review:
          application.status === 'submitted'
            ? 'completed'
            : 'pending',
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to get application progress: ${error.message}`
    );
  }
};


/**
 * Save student info (Step 1)
 * POST /api/applications/:id/student-info
 */
export const saveStudentInfo = async (applicationId, data) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: {
          id: BigInt(applicationId),
        },
        select: {
          id: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Convert HTML date input (YYYY-MM-DD)
      // into a JavaScript Date for Prisma DateTime.
      const normalizedData = {
        ...data,
        date_of_birth: data.date_of_birth
          ? new Date(`${data.date_of_birth}T00:00:00.000Z`)
          : null,
      };

      const studentInfo = await tx.application_student_info.upsert({
        where: {
          application_id: BigInt(applicationId),
        },

        create: {
          application_id: BigInt(applicationId),
          ...normalizedData,
        },

        update: {
          ...normalizedData,
          updated_at: new Date(),
        },
      });

      await tx.application.update({
        where: {
          id: BigInt(applicationId),
        },
        data: {
          current_step: 2,
          updated_at: new Date(),
        },
      });

      return studentInfo;
    });

    return result;
  } catch (error) {
    throw new Error(
      `Failed to save student information: ${error.message}`
    );
  }
};

/**
 * Save parent info (Step 2)
 * POST /api/applications/:id/parent-info
 */
export const saveParentInfo = async (applicationId, data) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: {
          id: BigInt(applicationId),
        },
        select: {
          id: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const parentInfo = await tx.application_parent_info.upsert({
        where: {
          application_id: BigInt(applicationId),
        },
        create: {
          application_id: BigInt(applicationId),
          ...data,
        },
        update: {
          ...data,
          updated_at: new Date(),
        },
      });

      await tx.application.update({
        where: {
          id: BigInt(applicationId),
        },
        data: {
          current_step: 3,
          updated_at: new Date(),
        },
      });

      return parentInfo;
    });

    return result;
  } catch (error) {
    throw new Error(
      `Failed to save parent information: ${error.message}`
    );
  }
};

/**
 * Save academic info (Step 3)
 * POST /api/applications/:id/academic-info
 */
/**
 * Save academic info (Step 3)
 * POST /api/applications/:id/academic-info
 */
export const saveAcademicInfo = async (applicationId, schoolId, data) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: {
          id: BigInt(applicationId),
          school_id: BigInt(schoolId),
        },
        select: {
          id: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (!data?.desired_class || !String(data.desired_class).trim()) {
        throw new Error('desired_class is required');
      }

      const academicInfo = await tx.application_academic_info.upsert({
        where: {
          application_id: BigInt(applicationId),
        },

        create: {
          application_id: BigInt(applicationId),
          desired_class: String(data.desired_class).trim(),
          previous_school: data.previous_school ?? null,
          previous_class: data.previous_class ?? null,
          marks_percentage: data.marks_percentage ?? null,
          board_name: data.board_name ?? null,
          academic_year: data.academic_year ?? null,
          additional_qualifications:
            data.additional_qualifications ?? null,
          extracurricular_activities:
            data.extracurricular_activities ?? null,
          achievements: data.achievements ?? null,
        },

        update: {
          desired_class: String(data.desired_class).trim(),
          previous_school: data.previous_school ?? null,
          previous_class: data.previous_class ?? null,
          marks_percentage: data.marks_percentage ?? null,
          board_name: data.board_name ?? null,
          academic_year: data.academic_year ?? null,
          additional_qualifications:
            data.additional_qualifications ?? null,
          extracurricular_activities:
            data.extracurricular_activities ?? null,
          achievements: data.achievements ?? null,
          updated_at: new Date(),
        },
      });

      await tx.application.update({
        where: {
          id: BigInt(applicationId),
        },
        data: {
          current_step: 4,
          updated_at: new Date(),
        },
      });

      return academicInfo;
    });

    return result;
  } catch (error) {
    throw new Error(
      `Failed to save academic information: ${error.message}`
    );
  }
};

/**
 * Save documents (Step 5)
 * POST /api/applications/:id/documents
 */
export const saveDocuments = async (applicationId, data, uploadedBy = null) => {
  try {
    const applicationIdBigInt = BigInt(applicationId);

    const application = await prisma.application.findUnique({
      where: {
        id: applicationIdBigInt,
      },
      select: {
        id: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const photos = data?.photos || {};
    const documents = data?.documents || {};

    const records = [];

    const addDocument = (documentType, value) => {
      if (!value) return;

      const record = normalizeFileRecord(value);

      if (!record) return;

      records.push({
        document_type: normalizeApplicationDocumentType(documentType).normalized,
        file_name: record.file_name || null,
        file_path: record.file_path || null,
        document_number: record.document_number || null,
        file_size:
          record.file_size !== undefined && record.file_size !== null
            ? Number(record.file_size)
            : null,
        mime_type: record.mime_type || null,
      });
    };

    // Photos are stored in application_documents as document types.
    addDocument(
      'student_photo',
      photos.student_photo || photos.studentPhoto
    );

    addDocument(
      'passport_photos',
      photos.passport_photos || photos.passportPhotos
    );

    // Regular application documents.
    for (const [documentType, value] of Object.entries(documents)) {
      addDocument(documentType, value);
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const record of records) {
        await tx.application_documents.upsert({
          where: {
            application_id_document_type: {
              application_id: applicationIdBigInt,
              document_type: record.document_type,
            },
          },
          create: {
            application_id: applicationIdBigInt,
            document_type: record.document_type,
            file_name: record.file_name,
            file_path: record.file_path,
            document_number: record.document_number,
            file_size: record.file_size,
            mime_type: record.mime_type,
            uploaded_by:
              uploadedBy !== null && uploadedBy !== undefined
                ? BigInt(uploadedBy)
                : null,
            verification_status: 'pending',
          },
          update: {
            file_name: record.file_name,
            file_path: record.file_path,
            document_number: record.document_number,
            file_size: record.file_size,
            mime_type: record.mime_type,
            uploaded_by:
              uploadedBy !== null && uploadedBy !== undefined
                ? BigInt(uploadedBy)
                : null,
            verification_status: 'pending',
            rejection_reason: null,
            verified_by: null,
            verified_at: null,
            updated_at: new Date(),
          },
        });
      }

      await tx.application.update({
        where: {
          id: applicationIdBigInt,
        },
        data: {
          current_step: 5,
          updated_at: new Date(),
        },
      });

      return tx.application_documents.findMany({
        where: {
          application_id: applicationIdBigInt,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    return result;
  } catch (error) {
    throw new Error(
      `Failed to save documents: ${error.message}`
    );
  }
};

/**
 * Submit application (Step 6)
 * POST /api/applications/:id/submit
 */
export const submitApplication = async (applicationId) => {
  try {
    const id = BigInt(applicationId);

    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'in_progress' && application.status !== 'draft') {
        throw new Error(
          `Application cannot be submitted from status: ${application.status}`
        );
      }

      const updatedApplication = await tx.application.update({
        where: {
          id,
        },
        data: {
          status: 'submitted',
          submitted_at: new Date(),
          current_step: 6,
          updated_at: new Date(),
        },
        select: {
          id: true,
          application_number: true,
          status: true,
          current_step: true,
          submitted_at: true,
          updated_at: true,
        },
      });

      return updatedApplication;
    });

    return result;
  } catch (error) {
    throw new Error(
      `Failed to submit application: ${error.message}`
    );
  }
};

export const moveApplicationToReview = async (applicationId, schoolId) => {
  try {
    const id = BigInt(applicationId);

    const application = await prisma.application.findFirst({
      where: {
        id,
        school_id: BigInt(schoolId),
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== "submitted") {
      throw new Error(
        `Application cannot move to review from status: ${application.status}`
      );
    }

    const updatedApplication = await prisma.application.update({
      where: {
        id,
      },
      data: {
        status: "under_review",
        updated_at: new Date(),
      },
      select: {
        id: true,
        application_number: true,
        status: true,
        updated_at: true,
      },
    });

    return updatedApplication;
  } catch (error) {
    throw new Error(
      `Failed to move application to review: ${error.message}`
    );
  }
};

/**
 * Get application details for prefill
 */
export const getApplicationDetails = async (applicationId, schoolId) => {
  try {
    const id = BigInt(applicationId);

    const application = await prisma.application.findFirst({
      where: {
        id,
        ...(schoolId ? { school_id: BigInt(schoolId) } : {}),
      },
      select: {
        id: true,
        school_id: true,
        academic_year_id: true,
        lead_id: true,
        application_number: true,
        status: true,
        current_step: true,
        assigned_to: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        submitted_at: true,

        academic_year: {
          select: {
            year_name: true,
          },
        },

        app_user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        lead: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            desired_class: true,
          },
        },

        application_student_info: true,
        application_parent_info: true,
        application_academic_info: true,

        application_documents: {
          orderBy: [
            { created_at: 'desc' },
            { id: 'desc' },
          ],
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const documents = application.application_documents || [];

    const photoMap = {};
    const documentMap = {};

    for (const document of documents) {
      const normalized = normalizeFileRecord(document);

      if (!normalized) continue;

      if (APPLICATION_PHOTO_TYPES.includes(document.document_type)) {
        photoMap[document.document_type] = normalized;
      } else {
        documentMap[document.document_type] = normalized;
      }
    }

    return {
      application: {
        ...application,

        id: application.id?.toString(),
        school_id: application.school_id?.toString(),
        academic_year_id: application.academic_year_id?.toString(),
        lead_id: application.lead_id?.toString(),
        assigned_to: application.assigned_to?.toString(),

        academic_year_name:
          application.academic_year?.year_name || null,

        lead_first_name:
          application.lead?.first_name || null,

        lead_last_name:
          application.lead?.last_name || null,

        lead_email:
          application.lead?.email || null,

        lead_phone:
          application.lead?.phone || null,

        lead_desired_class:
          application.lead?.desired_class || null,
      },

      student_info: application.application_student_info || {},
      parent_info: application.application_parent_info || {},
      academic_info: application.application_academic_info || {},
      photos: photoMap,
      documents: documentMap,
    };
  } catch (error) {
    throw new Error(`Failed to get application details: ${error.message}`);
  }
};

const STEP_ORDER = ['student', 'parent', 'academic', 'documents', 'review'];



const getDefaultClassAndSection = async (schoolId) => {
  const schoolClass = await prisma.school_class.findFirst({
    where: {
      school_id: BigInt(schoolId),
    },
    orderBy: {
      class_numeric_value: 'asc',
    },
    select: {
      id: true,
    },
  });

  if (!schoolClass) {
    throw new Error('No classes configured for this school');
  }

  const section = await prisma.section.findFirst({
    where: {
      class_id: schoolClass.id,
    },
    orderBy: {
      section_name: 'asc',
    },
    select: {
      id: true,
    },
  });

  if (!section) {
    throw new Error('No sections configured for default class');
  }

  return {
    classId: schoolClass.id,
    sectionId: section.id,
  };
};

export const startAdmissionApplication = async (schoolId, payload = {}) => {
  try {
    const { lead_id, academic_year_id } = payload;

    if (!schoolId || !lead_id || !academic_year_id) {
      throw new Error(
        'school_id, lead_id and academic_year_id are required'
      );
    }

    const schoolIdBigInt = BigInt(schoolId);
    const leadIdBigInt = BigInt(lead_id);
    const academicYearIdBigInt = BigInt(academic_year_id);

    const result = await prisma.$transaction(async (tx) => {
      // Check if an application already exists for this lead
      const existingApplication = await tx.application.findFirst({
        where: {
          school_id: schoolIdBigInt,
          lead_id: leadIdBigInt,
          status: {
            in: ['in_progress', 'draft'],
          },
        },
        orderBy: {
          id: 'desc',
        },
        select: {
          id: true,
          current_step: true,
          status: true,
        },
      });

      if (existingApplication) {
        return {
          application_id: existingApplication.id,
          current_step: existingApplication.current_step || 1,
          status: existingApplication.status || 'in_progress',
          resumed: true,
        };
      }

      // Verify lead belongs to this school
      const lead = await tx.lead.findFirst({
        where: {
          id: leadIdBigInt,
          school_id: schoolIdBigInt,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          phone: true,
          email: true,
          desired_class: true,
        },
      });

      if (!lead) {
        throw new Error('Lead not found for this school');
      }

      // Verify academic year
      const academicYear = await tx.academic_year.findFirst({
        where: {
          id: academicYearIdBigInt,
          school_id: schoolIdBigInt,
        },
        select: {
          id: true,
        },
      });

      if (!academicYear) {
        throw new Error('Academic year not found for this school');
      }

      // Create application
      const applicationNumber =
        `APP-${new Date().getFullYear()}-${Date.now()}`;

      const application = await tx.application.create({
        data: {
          school_id: schoolIdBigInt,
          lead_id: leadIdBigInt,
          academic_year_id: academicYearIdBigInt,
          application_number: applicationNumber,
          current_step: 1,
          status: 'in_progress',
        },
        select: {
          id: true,
          current_step: true,
          status: true,
        },
      });

      return {
        application_id: application.id.toString(),
        current_step: application.current_step,
        status: application.status,
        resumed: false,
      };
    });

    return result;
  } catch (error) {
    throw new Error(
      `Failed to start admission application: ${error.message}`
    );
  }
};

export const saveAdmissionStep = async (schoolId, payload = {}) => {
  const rawAdmissionId = payload.admission_id ?? payload.application_id;
  const admissionId = BigInt(rawAdmissionId);
  const { step, data = {} } = payload;

  try {
    if (!schoolId) {
      throw new Error('Valid school_id is required');
    }

    if (admissionId <= 0n) {
      throw new Error('Valid admission_id is required');
    }

    if (!step || !STEP_ORDER.includes(step)) {
      throw new Error('Valid step is required');
    }

    const schoolIdBigInt = BigInt(schoolId);

    return await prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findFirst({
        where: {
          id: admissionId,
          school_id: schoolIdBigInt,
        },
        select: {
          id: true,
          student_id: true,
          application_id: true,
        },
      });

      if (!admission) {
        throw new Error('Admission not found');
      }

      const studentId = admission.student_id;
      const linkedApplicationId = admission.application_id;

      // STEP 1 — Student
      if (step === 'student') {
        if (!studentId) {
          throw new Error('Student not found for admission');
        }

        await tx.student.update({
          where: {
            id: studentId,
          },
          data: {
            admission_id: admissionId,
            first_name: data.first_name || undefined,
            last_name: data.last_name || undefined,
            date_of_birth:
              data.date_of_birth || data.dob
                ? new Date(data.date_of_birth || data.dob)
                : undefined,
            gender: data.gender || undefined,
            phone:
              data.phone || data.student_phone || undefined,
            email:
              data.email || data.student_email || undefined,
            updated_at: new Date(),
          },
        });
      }

      // STEP 2 — Parent
      if (step === 'parent') {
        if (!studentId) {
          throw new Error('Student not found for admission');
        }

        await tx.parent_detail.upsert({
          where: {
            admission_id: admissionId,
          },
          create: {
            school_id: schoolIdBigInt,
            student_id: studentId,
            admission_id: admissionId,
            relation:
              data.primary_contact_relation || 'Father',
            first_name:
              data.father_name ||
              data.fatherName ||
              data.primary_contact_person ||
              'Parent',
            last_name: null,
            phone:
              data.primary_contact_phone ||
              data.father_phone ||
              data.fatherPhone ||
              null,
            email:
              data.father_email ||
              data.fatherEmail ||
              null,
            occupation:
              data.father_occupation ||
              data.fatherOccupation ||
              null,
            address: data.address || null,
            city: data.city || null,
            income_range:
              data.income_range ||
              data.incomeRange ||
              null,
          },
          update: {
            relation:
              data.primary_contact_relation || 'Father',
            first_name:
              data.father_name ||
              data.fatherName ||
              data.primary_contact_person ||
              'Parent',
            last_name: null,
            phone:
              data.primary_contact_phone ||
              data.father_phone ||
              data.fatherPhone ||
              null,
            email:
              data.father_email ||
              data.fatherEmail ||
              null,
            occupation:
              data.father_occupation ||
              data.fatherOccupation ||
              null,
            address: data.address || null,
            city: data.city || null,
            income_range:
              data.income_range ||
              data.incomeRange ||
              null,
            updated_at: new Date(),
          },
        });
      }

      // STEP 3 — Academic
      if (step === 'academic') {
        const targetApplicationId =
          data.application_id || linkedApplicationId;

        if (!targetApplicationId) {
          throw new Error('application_id is required for academic step');
        }

        const applicationIdBigInt = BigInt(targetApplicationId);

        const application = await tx.application.findFirst({
          where: {
            id: applicationIdBigInt,
            school_id: schoolIdBigInt,
          },
          select: {
            id: true,
          },
        });

        if (!application) {
          throw new Error('Application not found');
        }

        await tx.application_academic_info.upsert({
          where: {
            application_id: applicationIdBigInt,
          },
          create: {
            application_id: applicationIdBigInt,
            school_id: schoolIdBigInt,
            desired_class: data.desired_class,
            previous_school:
              data.previous_school || null,
            previous_class:
              data.previous_class || null,
            marks_percentage:
              data.marks_percentage ?? null,
            board_name:
              data.board_name || null,
            academic_year:
              data.academic_year || null,
            additional_qualifications:
              data.additional_qualifications || null,
            extracurricular_activities:
              data.extracurricular_activities || null,
            achievements:
              data.achievements || null,
          },
          update: {
            desired_class: data.desired_class,
            previous_school:
              data.previous_school || null,
            previous_class:
              data.previous_class || null,
            marks_percentage:
              data.marks_percentage ?? null,
            board_name:
              data.board_name || null,
            academic_year:
              data.academic_year || null,
            additional_qualifications:
              data.additional_qualifications || null,
            extracurricular_activities:
              data.extracurricular_activities || null,
            achievements:
              data.achievements || null,
            updated_at: new Date(),
          },
        });

        await tx.application.update({
          where: {
            id: applicationIdBigInt,
          },
          data: {
            current_step: 4,
            updated_at: new Date(),
          },
        });
      }

      // STEP 4 — Documents
      if (step === 'documents') {
        const photos = data.photos || {};
        const docs = data.documents || {};

        if (studentId) {
          await tx.student_photos.upsert({
            where: {
              admission_id: admissionId,
            },
            create: {
              school_id: schoolIdBigInt,
              admission_id: admissionId,
              student_photo:
                photos.student_photo ||
                photos.studentPhoto ||
                null,
              passport_photos:
                photos.passport_photos ||
                photos.passportPhotos ||
                null,
            },
            update: {
              ...(photos.student_photo || photos.studentPhoto
                ? {
                    student_photo:
                      photos.student_photo ||
                      photos.studentPhoto,
                  }
                : {}),
              ...(photos.passport_photos ||
              photos.passportPhotos
                ? {
                    passport_photos:
                      photos.passport_photos ||
                      photos.passportPhotos,
                  }
                : {}),
              updated_at: new Date(),
            },
          });

          await tx.student_documents.upsert({
            where: {
              admission_id: admissionId,
            },
            create: {
              school_id: schoolIdBigInt,
              admission_id: admissionId,
              birth_certificate:
                docs.birth_certificate || null,
              aadhaar_card:
                docs.aadhaar_card ||
                docs.aadhaarCard ||
                null,
              passport_photos:
                docs.passport_photos ||
                docs.passportPhotos ||
                null,
              transfer_certificate:
                docs.transfer_certificate || null,
              previous_report_card:
                docs.previous_report_card ||
                docs.previousReportCard ||
                null,
              address_proof:
                docs.address_proof || null,
              parent_id_proof:
                docs.parent_id_proof ||
                docs.parentIdProof ||
                null,
            },
            update: {
              ...(docs.birth_certificate
                ? {
                    birth_certificate:
                      docs.birth_certificate,
                  }
                : {}),
              ...(docs.aadhaar_card ||
              docs.aadhaarCard
                ? {
                    aadhaar_card:
                      docs.aadhaar_card ||
                      docs.aadhaarCard,
                  }
                : {}),
              ...(docs.passport_photos ||
              docs.passportPhotos
                ? {
                    passport_photos:
                      docs.passport_photos ||
                      docs.passportPhotos,
                  }
                : {}),
              ...(docs.transfer_certificate
                ? {
                    transfer_certificate:
                      docs.transfer_certificate,
                  }
                : {}),
              ...(docs.previous_report_card ||
              docs.previousReportCard
                ? {
                    previous_report_card:
                      docs.previous_report_card ||
                      docs.previousReportCard,
                  }
                : {}),
              ...(docs.address_proof
                ? {
                    address_proof:
                      docs.address_proof,
                  }
                : {}),
              ...(docs.parent_id_proof ||
              docs.parentIdProof
                ? {
                    parent_id_proof:
                      docs.parent_id_proof ||
                      docs.parentIdProof,
                  }
                : {}),
              updated_at: new Date(),
            },
          });
        }
      }

      // Move to next step
      const currentIndex = STEP_ORDER.indexOf(step);

      const nextStep =
        currentIndex >= 0 &&
        currentIndex < STEP_ORDER.length - 1
          ? STEP_ORDER[currentIndex + 1]
          : step;

      await tx.admission.update({
        where: {
          id: admissionId,
        },
        data: {
          current_step: nextStep,
          status: 'draft',
          is_completed: false,
          updated_at: new Date(),
        },
      });

      return {
        admission_id: admissionId,
        current_step: nextStep,
        status: 'draft',
      };
    });
  } catch (error) {
    throw new Error(`Failed to save step: ${error.message}`);
  }
};

export const getAdmissionApplicationById = async (schoolId, admissionId) => {
  try {
    const schoolIdBigInt = BigInt(schoolId);
    const admissionIdBigInt = BigInt(admissionId);

    const admission = await prisma.admission.findFirst({
      where: {
        id: admissionIdBigInt,
        school_id: schoolIdBigInt,
      },
      select: {
        id: true,
        school_id: true,
        lead_id: true,
        application_id: true,
        student_id: true,
        academic_year_id: true,
        class_id: true,
        section_id: true,
        status: true,
        current_step: true,
        is_completed: true,
        created_at: true,
        updated_at: true,

        student: true,

        parent_detail: {
          take: 1,
        },

        application: {
          select: {
            application_academic_info: true,
          },
        },

        student_photos: {
          take: 1,
        },

        student_documents: {
          take: 1,
        },
      },
    });

    if (!admission) {
      throw new Error('Admission not found');
    }

    return {
      admission: {
        id: admission.id,
        school_id: admission.school_id,
        lead_id: admission.lead_id,
        application_id: admission.application_id,
        student_id: admission.student_id,
        academic_year_id: admission.academic_year_id,
        class_id: admission.class_id,
        section_id: admission.section_id,
        status: admission.status,
        current_step: admission.current_step,
        is_completed: admission.is_completed,
        created_at: admission.created_at,
        updated_at: admission.updated_at,
      },

      student: admission.student || null,

      parent: admission.parent_detail?.[0] || null,

      academic:
        admission.application?.application_academic_info || null,

      photos: admission.student_photos?.[0] || null,

      documents: admission.student_documents?.[0] || null,

      current_step: admission.current_step || 'student',
    };
  } catch (error) {
    throw new Error(
      `Failed to get admission application: ${error.message}`
    );
  }
};

export const approveApplication = async (applicationId, schoolId) => {
  try {
    const id = BigInt(applicationId);
    const schoolIdBigInt = BigInt(schoolId);

    const application = await prisma.application.findFirst({
      where: {
        id,
        school_id: schoolIdBigInt,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== "under_review") {
      throw new Error(
        `Application cannot be approved from status: ${application.status}`
      );
    }

    return await prisma.application.update({
      where: {
        id,
      },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
      select: {
        id: true,
        application_number: true,
        status: true,
        updated_at: true,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to approve application: ${error.message}`
    );
  }
};

export const completeAdmissionApplication = async (schoolId, admissionId) => {
  try {
    const schoolIdBigInt = BigInt(schoolId);
    const admissionIdBigInt = BigInt(admissionId);

    return await prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findFirst({
        where: {
          id: admissionIdBigInt,
          school_id: schoolIdBigInt,
        },
        select: {
          id: true,
          status: true,
          is_completed: true,
        },
      });

      if (!admission) {
        throw new Error('Admission not found');
      }

      const documents = await tx.student_documents.findFirst({
        where: {
          admission_id: admissionIdBigInt,
        },
      });

      const photos = await tx.student_photos.findFirst({
        where: {
          admission_id: admissionIdBigInt,
        },
      });

      const mandatoryDocuments = [
        'birth_certificate',
        'aadhaar_card',
        'passport_photos',
        'transfer_certificate',
        'previous_report_card',
        'address_proof',
        'parent_id_proof',
      ];

      const missingDocs = mandatoryDocuments.filter(
        (key) => !documents?.[key]
      );

      if (!photos?.student_photo) {
        throw new Error(
          'Student photo is mandatory before confirmation'
        );
      }

      if (missingDocs.length) {
        throw new Error(
          `Missing required documents: ${missingDocs.join(', ')}`
        );
      }

      const updatedAdmission = await tx.admission.update({
        where: {
          id: admissionIdBigInt,
        },
        data: {
          status: 'submitted',
          is_completed: true,
          current_step: 'review',
          updated_at: new Date(),
        },
        select: {
          id: true,
          status: true,
          is_completed: true,
          current_step: true,
        },
      });

      return updatedAdmission;
    });
  } catch (error) {
    throw new Error(
      `Failed to complete admission application: ${error.message}`
    );
  }
};

export const markApplicationCompleted = async (schoolId, applicationId) => {
  try {
    const application = await prisma.application.findFirst({
      where: {
        id: BigInt(applicationId),
        school_id: BigInt(schoolId),
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== "under_review") {
      throw new Error(
        `Application cannot be completed from status: ${application.status}`
      );
    }

    return await prisma.application.update({
      where: {
        id: application.id,
      },
      data: {
        status: "admission_completed",
        updated_at: new Date(),
      },
      select: {
        id: true,
        application_number: true,
        status: true,
        current_step: true,
        updated_at: true,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to complete application: ${error.message}`
    );
  }
};

/**
 * Delete a draft application
 * Only allows deletion if status is 'draft'
 */
export const deleteApplication = async (schoolId, applicationId) => {
  try {
    const schoolIdBigInt = BigInt(schoolId);
    const applicationIdBigInt = BigInt(applicationId);

    return await prisma.$transaction(async (tx) => {
      const application = await tx.application.findFirst({
        where: {
          id: applicationIdBigInt,
          school_id: schoolIdBigInt,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'draft') {
        throw new Error(
          'Cannot delete application because it is not in draft status'
        );
      }

      // Delete related application records first.
      await tx.application_documents.deleteMany({
        where: {
          application_id: applicationIdBigInt,
        },
      });

      await tx.application_student_info.deleteMany({
        where: {
          application_id: applicationIdBigInt,
        },
      });

      await tx.application_parent_info.deleteMany({
        where: {
          application_id: applicationIdBigInt,
        },
      });

      await tx.application_academic_info.deleteMany({
        where: {
          application_id: applicationIdBigInt,
        },
      });

      // Delete the application itself.
      const deleted = await tx.application.delete({
        where: {
          id: applicationIdBigInt,
        },
        select: {
          id: true,
          application_number: true,
        },
      });

      return deleted;
    });
  } catch (error) {
    throw new Error(
      `Failed to delete application: ${error.message}`
    );
  }
};
