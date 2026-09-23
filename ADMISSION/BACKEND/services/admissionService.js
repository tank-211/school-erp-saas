import prisma from '../src/lib/prisma.js';
import fs from 'fs/promises';
import path from 'path';

/** 
 * Get admission statistics
 * Returns the total number of records from the admission table
 */
export const getAdmissionStats = async (schoolId) => {
  try {
    const schoolIdBigInt = BigInt(schoolId);

    const [
      total,
      submitted,
      underReview,
      approved,
      waitlisted,
    ] = await Promise.all([
      prisma.admission.count({
        where: {
          school_id: schoolIdBigInt,
        },
      }),

      prisma.admission.count({
        where: {
          school_id: schoolIdBigInt,
          status: 'submitted',
        },
      }),

      prisma.admission.count({
        where: {
          school_id: schoolIdBigInt,
          status: 'under_review',
        },
      }),

      prisma.admission.count({
        where: {
          school_id: schoolIdBigInt,
          status: 'approved',
        },
      }),

      prisma.admission.count({
        where: {
          school_id: schoolIdBigInt,
          status: 'waitlisted',
        },
      }),
    ]);

    return {
      total,
      submitted,
      under_review: underReview,
      approved,
      waitlisted,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch admission stats: ${error.message}`
    );
  }
};

/**
 * Search admissions by student name or parent contact
 * @param {string} query - Search query (student name or parent phone)
 * @returns {Array} Array of matching admissions
 */
export const searchAdmissions = async (schoolId, query) => {
  try {
    const schoolIdBigInt = BigInt(schoolId);
    const search = String(query || '').trim();

    if (!search) {
      return [];
    }

    const terms = search.split(/\s+/).filter(Boolean);

    const nameCondition =
      terms.length >= 2
        ? {
            AND: [
              {
                student: {
                  first_name: {
                    contains: terms[0],
                    mode: 'insensitive',
                  },
                },
              },
              {
                student: {
                  last_name: {
                    contains: terms[1],
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {
            OR: [
              {
                student: {
                  first_name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                student: {
                  last_name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                student: {
                  parent_detail: {
                    some: {
                      phone: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              },
            ],
          };

    const admissions = await prisma.admission.findMany({
      where: {
        school_id: schoolIdBigInt,
        ...nameCondition,
      },

      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            parent_detail: {
              select: {
                phone: true,
              },
              take: 1,
            },
          },
        },

        school_class: {
          select: {
            class_name: true,
          },
        },
      },

      orderBy: {
        created_at: 'desc',
      },

      take: 100,
    });

    return admissions.map((admission) => {
      const student = admission.student;
      const parent = student?.parent_detail?.[0];

      return {
        application_id: admission.id.toString(),
        student_name: [
          student?.first_name,
          student?.last_name,
        ]
          .filter(Boolean)
          .join(' '),

        grade: admission.school_class?.class_name || null,

        parent_contact: parent?.phone || 'N/A',

        submitted_date: admission.created_at
          ? admission.created_at.toISOString().split('T')[0]
          : 'N/A',

        status: admission.status,
      };
    });
  } catch (error) {
    throw new Error(
      `Search failed: ${error.message}`
    );
  }
};

/**
 * Get all admissions with pagination and filters
 * @param {number} limit - Number of records per page
 * @param {number} offset - Number of records to skip
 * @returns {Object} Admissions list and total count
 */
export const getAdmissions = async (schoolId, limit = 10, offset = 0) => {
  try {
    const schoolIdBigInt = BigInt(schoolId);

    const safeLimit = Math.max(1, Number(limit) || 10);
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [total, admissions] = await Promise.all([
      prisma.admission.count({
        where: {
          school_id: schoolIdBigInt,
        },
      }),

      prisma.admission.findMany({
        where: {
          school_id: schoolIdBigInt,
        },

       include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,

            parent_detail: {
              select: {
                phone: true,
              },
              take: 1,
            },
          },
        },

        school_class: {
          select: {
            class_name: true,
          },
        },

        section: {
          select: {
            section_name: true,
          },
        },

            application_progress: {
              select: {
                student_info_status: true,
                parent_info_status: true,
                academic_details_status: true,
                photos_status: true,
                documents_status: true,
                review_status: true,
              },
            },
          },

          orderBy: {
          created_at: 'desc',
        },

        take: safeLimit,
        skip: safeOffset,
      }),
    ]);
    return {
      data: admissions.map((admission) => {
        const student = admission.student;
        const parent = student?.parent_detail?.[0];

        const progress = admission.application_progress;

    let currentStep = 'student';

    if (progress?.review_status === 'completed') {
      currentStep = 'review';
    } else if (
      progress?.documents_status === 'completed' ||
      progress?.photos_status === 'completed'
    ) {
      currentStep = 'review';
    } else if (progress?.academic_details_status === 'completed') {
      currentStep = 'documents';
    } else if (progress?.parent_info_status === 'completed') {
      currentStep = 'academic';
    } else if (progress?.student_info_status === 'completed') {
      currentStep = 'parent';
    }

    const isCompleted =
      admission.status === 'submitted' ||
      admission.status === 'admission_completed';

    return {
      admission_id: admission.id.toString(),
      application_id: admission.application_id
        ? admission.application_id.toString()
        : null,
      student_id: student?.id
        ? student.id.toString()
        : null,

      current_step: currentStep,
      is_completed: isCompleted,
      student_id: student?.id
        ? student.id.toString()
        : null,

      student_name: [
        student?.first_name,
        student?.last_name,
      ]
        .filter(Boolean)
        .join(' '),

      grade: admission.school_class?.class_name || null,

      section: admission.section?.section_name || null,

      parent_contact: parent?.phone || 'N/A',

      submitted_date: admission.created_at
        ? admission.created_at.toISOString().split('T')[0]
        : 'N/A',

      status: admission.status,
    };
  }),

      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch admissions: ${error.message}`
    );
  }
};

/**
 * Get admission details by application ID
 * @param {string} applicationId - Application ID
 * @returns {Object} Admission details
 */
export const getAdmissionById = async (schoolId, applicationId) => {
  try {
    const schoolIdBigInt = BigInt(schoolId);
    const admissionIdBigInt = BigInt(applicationId);

    const admission = await prisma.admission.findFirst({
      where: {
        id: admissionIdBigInt,
        school_id: schoolIdBigInt,
      },

      include: {
        student: {
          include: {
            parent_detail: {
              take: 1,
            },
          },
        },

        school_class: {
          select: {
            class_name: true,
          },
        },

        section: {
          select: {
            section_name: true,
          },
        },
      },
    });

    if (!admission) {
      throw new Error('Admission not found');
    }

    const student = admission.student;
    const parent = student?.parent_detail?.[0];

    return {
      application_id: admission.id.toString(),

      school_id: admission.school_id
        ? admission.school_id.toString()
        : null,

      student_id: admission.student_id
        ? admission.student_id.toString()
        : null,

      academic_year_id: admission.academic_year_id
        ? admission.academic_year_id.toString()
        : null,

      class_id: admission.class_id
        ? admission.class_id.toString()
        : null,

      section_id: admission.section_id
        ? admission.section_id.toString()
        : null,

      admission_date: admission.admission_date,
      status: admission.status,
      admission_type: admission.admission_type,
      registration_number: admission.registration_number,
      previous_school: admission.previous_school,

      id: student?.id
        ? student.id.toString()
        : null,      
        first_name: student?.first_name,
      last_name: student?.last_name,
      date_of_birth: student?.date_of_birth,
      gender: student?.gender,
      aadhar_number: student?.aadhar_number,
      phone: student?.phone,
      email: student?.email,

      class_name: admission.school_class?.class_name || null,
      section_name: admission.section?.section_name || null,

      parent_first_name: parent?.first_name || null,
      parent_last_name: parent?.last_name || null,
      parent_phone: parent?.phone || null,
      relation: parent?.relation || null,
      parent_email: parent?.email || null,
      occupation: parent?.occupation || null,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch admission details: ${error.message}`
    );
  }
};

export const createAdmission = async (studentData, parentData, admissionData) => {
  try {
    const schoolId = BigInt(admissionData.school_id || 1);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create student
      const student = await tx.student.create({
        data: {
          school_id: schoolId,
          admission_number:
            admissionData.admission_number || `ADM-${Date.now()}`,

          first_name: studentData.first_name,
          last_name: studentData.last_name || null,
          date_of_birth: studentData.date_of_birth
            ? new Date(studentData.date_of_birth)
            : null,

          gender: studentData.gender || 'Other',
          email: studentData.email || null,
          phone: studentData.phone || null,
          status: 'active',
        },

        select: {
          id: true,
        },
      });

      // 2. Create parent
      await tx.parent_detail.create({
        data: {
          school_id: schoolId,
          student_id: student.id,

          relation: parentData.relation || 'Father',
          first_name: parentData.first_name,
          last_name: parentData.last_name || null,
          email: parentData.email || null,
          phone: parentData.phone || null,
          occupation: parentData.occupation || null,
        },
      });

      // 3. Create admission
      const admission = await tx.admission.create({
        data: {
          school_id: schoolId,
          student_id: student.id,

          lead_id: admissionData.lead_id
            ? BigInt(admissionData.lead_id)
            : null,

          academic_year_id: BigInt(
            admissionData.academic_year_id
          ),

          class_id: BigInt(admissionData.class_id),
          section_id: BigInt(admissionData.section_id),

          admission_date: admissionData.admission_date
            ? new Date(admissionData.admission_date)
            : new Date(),

          status: admissionData.status || 'active',
          admission_type: admissionData.admission_type || 'new',

          registration_number:
            admissionData.registration_number || null,

          previous_school:
            admissionData.previous_school || null,

          created_by: admissionData.created_by || 'system',
        },

        select: {
          id: true,
        },
      });

      return {
        student_id: student.id,
        admission_id: admission.id,
      };
    });

    return result.admission_id;
  } catch (error) {
    throw new Error(
      `Failed to create admission: ${error.message}`
    );
  }
};

const normalizeDigits = (value = '') => value.replace(/\D/g, '');

const toTitleCase = (value = '') =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const parseAcademicYearLabel = (value = '') => value.trim();

const extractClassNumericValue = (value = '') => {
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const documentTypeMap = {
  'photo_Student_Student Photograph': 'student_photo',
  'photo_Student_Student Aadhar Card': 'aadhar_card',
  'photo_Father_Father\'s Photograph': 'other',
  'photo_Father_Father\'s Aadhar Card': 'aadhar_card',
  'photo_Mother_Mother\'s Photograph': 'other',
  'photo_Mother_Mother\'s Aadhar Card': 'aadhar_card',
  doc_BirthCertificate: 'birth_certificate',
  doc_PreviousSchoolRecords: 'previous_marksheet',
  doc_AddressProof: 'other',
  doc_TransferCertificate: 'transfer_certificate',
};

const buildUploadedFilePath = (fileName) => {
  const baseDir = process.env.UPLOAD_DIR || './uploads';
  return `${baseDir.replace(/\\/g, '/')}/${fileName}`;
};

async function resolveSchoolContext(user, body) {
  if (body.lead_id) {
    const lead = await prisma.lead.findFirst({
      where: {
        id: BigInt(body.lead_id),
        school_id: BigInt(user.school_id),
      },
      select: {
        id: true,
        school_id: true,
        academic_year_id: true,
        desired_class: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found for this school');
    }

    return lead;
  }

  return {
    id: null,
    school_id: BigInt(user.school_id),
    academic_year_id: null,
    desired_class: body.grade_applied_for || null,
  };
}

async function resolveAcademicYearId(schoolId, body, leadContext) {
  const schoolIdBigInt = BigInt(schoolId);

  // If the request already provides an academic year ID, use it.
  if (body.academic_year_id) {
    const academicYear = await prisma.academic_year.findFirst({
      where: {
        id: BigInt(body.academic_year_id),
        school_id: schoolIdBigInt,
      },
      select: {
        id: true,
      },
    });

    if (!academicYear) {
      throw new Error('Academic year not found for this school');
    }

    return academicYear.id;
  }

  // If the lead already has an academic year, use it.
  if (leadContext?.academic_year_id) {
    return leadContext.academic_year_id;
  }

  // Otherwise use the currently active academic year.
  const activeYear = await prisma.academic_year.findFirst({
    where: {
      school_id: schoolIdBigInt,
      is_active: true,
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      id: true,
    },
  });

  if (activeYear) {
    return activeYear.id;
  }

  // Final fallback: latest academic year.
  const latestYear = await prisma.academic_year.findFirst({
    where: {
      school_id: schoolIdBigInt,
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      id: true,
    },
  });

  if (!latestYear) {
    throw new Error('No academic year configured for this school');
  }

  return latestYear.id;
}

async function resolveClassAndSection(schoolId, body, leadContext) {
  const schoolIdBigInt = BigInt(schoolId);

  let classRecord = null;

  // If class_id was supplied, verify it belongs to this school.
  if (body.class_id) {
    classRecord = await prisma.school_class.findFirst({
      where: {
        id: BigInt(body.class_id),
        school_id: schoolIdBigInt,
      },
      select: {
        id: true,
        class_name: true,
      },
    });
  }

  // Otherwise try to find the class using the requested grade.
  if (!classRecord) {
    const requestedClass =
      body.grade_applied_for ||
      body.class_name ||
      leadContext?.desired_class;

    if (requestedClass) {
      classRecord = await prisma.school_class.findFirst({
        where: {
          school_id: schoolIdBigInt,
          OR: [
            {
              class_name: {
                equals: String(requestedClass),
                mode: 'insensitive',
              },
            },
            {
              class_name: {
                contains: String(requestedClass),
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          class_name: true,
        },
      });
    }
  }

  // Final fallback: first configured class.
  if (!classRecord) {
    classRecord = await prisma.school_class.findFirst({
      where: {
        school_id: schoolIdBigInt,
      },
      orderBy: {
        class_numeric_value: 'asc',
      },
      select: {
        id: true,
        class_name: true,
      },
    });
  }

  if (!classRecord) {
    throw new Error('No classes configured for this school');
  }

  let sectionRecord = null;

  // Use supplied section_id if available.
  if (body.section_id) {
    sectionRecord = await prisma.section.findFirst({
      where: {
        id: BigInt(body.section_id),
        class_id: classRecord.id,
      },
      select: {
        id: true,
        section_name: true,
      },
    });
  }

  // Otherwise use the first section for the selected class.
  if (!sectionRecord) {
    sectionRecord = await prisma.section.findFirst({
      where: {
        class_id: classRecord.id,
      },
      orderBy: {
        section_name: 'asc',
      },
      select: {
        id: true,
        section_name: true,
      },
    });
  }

  if (!sectionRecord) {
    throw new Error(
      `No sections configured for class ${classRecord.class_name}`
    );
  }

  return {
    classId: classRecord.id,
    sectionId: sectionRecord.id,
  };
}

async function moveFilesToAdmissionFolder(admissionId, files) {
  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  const admissionFolder = path.join(uploadRoot, 'admissions', String(admissionId));
  await fs.mkdir(admissionFolder, { recursive: true });

  return Promise.all(
    files.map(async (file) => {
      const finalPath = path.join(admissionFolder, path.basename(file.filename));
      await fs.rename(file.path, finalPath);

      return {
        ...file,
        finalPath,
        relativePath: path
          .relative(process.cwd(), finalPath)
          .replace(/\\/g, '/'),
      };
    })
  );
}

async function insertUploadedDocuments(tx, admissionId, uploadedDocuments, userId = null) {
  if (!uploadedDocuments) {
    return [];
  }

  const documents = Array.isArray(uploadedDocuments)
    ? uploadedDocuments
    : Object.values(uploadedDocuments);

  if (!documents.length) {
    return [];
  }

  const admissionIdBigInt = BigInt(admissionId);
  const uploadedBy = userId ? BigInt(userId) : null;

  const createdDocuments = [];

  for (const document of documents) {
    if (!document) continue;

    const documentType =
      document.document_type ||
      document.type ||
      document.fieldname ||
      null;

    const fileName =
      document.file_name ||
      document.originalname ||
      document.filename ||
      null;

    const filePath =
      document.file_path ||
      document.path ||
      document.file_url ||
      null;

    if (!documentType || !fileName) {
      continue;
    }

    const normalizedType = String(documentType);

    const existing = await tx.documents.findFirst({
      where: {
        admission_id: admissionIdBigInt,
        document_type: normalizedType,
      },
      select: {
        id: true,
      },
    });

    let savedDocument;

    if (existing) {
      savedDocument = await tx.documents.update({
        where: {
          id: existing.id,
        },
        data: {
          file_name: fileName,
          file_path: filePath,
          document_number:
            document.document_number ||
            document.documentNumber ||
            null,
          uploaded_by: uploadedBy,
          updated_at: new Date(),
        },
      });
    } else {
      savedDocument = await tx.documents.create({
        data: {
          admission_id: admissionIdBigInt,
          document_type: normalizedType,
          file_name: fileName,
          file_path: filePath,
          document_number:
            document.document_number ||
            document.documentNumber ||
            null,
          uploaded_by: uploadedBy,
          verification_status: 'pending',
        },
      });
    }

    createdDocuments.push(savedDocument);
  }

  return createdDocuments;
}

export const createAdmissionFromFormData = async (user, body, files = {}) => {
  try {
    const schoolId = BigInt(user.school_id);

    // Resolve lead without SQL
    const leadContext = await resolveSchoolContext(user, body);

    // Resolve academic year without SQL
    const academicYearId = await resolveAcademicYearId(
      schoolId,
      body,
      leadContext
    );

    // Resolve class + section without SQL
    const { classId, sectionId } = await resolveClassAndSection(
      schoolId,
      body,
      leadContext
    );

    const result = await prisma.$transaction(async (tx) => {
      /*
       * 1. Create student
       */
      const student = await tx.student.create({
        data: {
          school_id: schoolId,

          admission_number:
            body.admission_number ||
            `ADM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,

          first_name:
            body.first_name ||
            body.student_first_name ||
            'Student',

          last_name:
            body.last_name ||
            body.student_last_name ||
            null,

          date_of_birth: body.date_of_birth
            ? new Date(body.date_of_birth)
            : null,

          gender: body.gender || 'Other',

          email:
            body.email ||
            body.student_email ||
            null,

          phone:
            body.phone ||
            body.student_phone ||
            null,

          status: 'active',

          created_by: user.id
            ? String(user.id)
            : 'system',
        },

        select: {
          id: true,
        },
      });

      /*
       * 2. Create parent details
       */
      const parentFirstName =
        body.parent_first_name ||
        body.father_first_name ||
        body.first_name_parent ||
        body.parent_name ||
        null;

      const parentLastName =
        body.parent_last_name ||
        body.father_last_name ||
        null;

      const parentPhone =
        body.parent_phone ||
        body.father_phone ||
        body.phone_parent ||
        null;

      const parentEmail =
        body.parent_email ||
        body.father_email ||
        body.email_parent ||
        null;

      if (parentFirstName || parentPhone || parentEmail) {
        await tx.parent_detail.create({
          data: {
            school_id: schoolId,
            student_id: student.id,

            relation:
              body.parent_relation ||
              body.relation ||
              'Father',

            first_name:
              parentFirstName ||
              'Parent',

            last_name: parentLastName,

            phone: parentPhone,

            email: parentEmail,

            occupation:
              body.parent_occupation ||
              body.father_occupation ||
              null,
          },
        });
      }

      /*
       * 3. Create admission
       */
      const admission = await tx.admission.create({
        data: {
          school_id: schoolId,
          student_id: student.id,

          lead_id: body.lead_id
            ? BigInt(body.lead_id)
            : null,

          academic_year_id: academicYearId,

          class_id: classId,
          section_id: sectionId,

          admission_date: body.admission_date
            ? new Date(body.admission_date)
            : new Date(),

          status:
            body.status ||
            'submitted',

          admission_type:
            body.admission_type ||
            'new',

          registration_number:
            body.registration_number ||
            null,

          previous_school:
            body.previous_school ||
            null,

          created_by:
            user.id
              ? String(user.id)
              : 'system',
        },

        select: {
          id: true,
        },
      });

      /*
       * 4. Create application progress
       */
      await tx.application_progress.create({
        data: {
          admission_id: admission.id,

          student_info_status: 'completed',
          parent_info_status: 'completed',
          academic_details_status: 'completed',
          photos_status: 'pending',
          documents_status: 'pending',
          review_status: 'pending',
        },
      });

      /*
       * 5. Save uploaded documents
       */
      const uploadedDocuments = [
        ...(Array.isArray(files.documents)
          ? files.documents
          : []),

        ...(Array.isArray(files.document)
          ? files.document
          : []),
      ];

      if (uploadedDocuments.length) {
        await insertUploadedDocuments(
          tx,
          admission.id,
          uploadedDocuments,
          user.id
        );
      }

      return admission;
    });

    return {
      admission_id: result.id,
      success: true,
    };
  } catch (error) {
    throw new Error(
      `Failed to create admission: ${error.message}`
    );
  }
};

export default {
  getAdmissionStats,
  searchAdmissions,
  getAdmissions,
  getAdmissionById,
  createAdmission,
  createAdmissionFromFormData
};
