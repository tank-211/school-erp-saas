import * as admissionService from '../services/admissionService.js';
import prisma from '../src/lib/prisma.js';

/**
 * Get admission statistics
 * GET /api/admissions/stats
 */ 
export const getAdmissionStats = async (req, res) => {
  console.log('API HIT: /api/admissions/stats');
  try {
    const stats = await admissionService.getAdmissionStats(req.user.school_id);
    res.json({
      success: true,
      data: stats,
      message: 'Admission statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching admission stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch admission statistics'
    });
  }
};

/**
 * Search admissions by student name or parent contact
 * GET /api/admissions/search?query=
 */
export const searchAdmissions = async (req, res) => {
  console.log('API HIT: /api/admissions/search');
  try {
    const { query } = req.query;
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }
    const results = await admissionService.searchAdmissions(req.user.school_id, query);
    res.json({
      success: true,
      data: results,
      message: `Found ${results.length} admission(s) matching your search`
    });
  } catch (error) {
    console.error('Error searching admissions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search admissions'
    });
  }
};

/**
 * Get all admissions with pagination
 * GET /api/admissions?limit=10&offset=0
 */
export const getAllAdmissions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    const result = await admissionService.getAdmissions(req.user.school_id, limit, offset);
    
    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        pages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admissions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch admissions'
    });
  }
};

/**
 * Get admission details by application ID
 * GET /api/admissions/:applicationId
 */
export const getAdmissionById = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    const admission = await admissionService.getAdmissionById(req.user.school_id, applicationId);
    
    res.json({
      success: true,
      data: admission
    });
  } catch (error) {
    console.error('Error fetching admission details:', error);
    
    if (error.message === 'Admission not found') {
      return res.status(404).json({
        success: false,
        message: 'Admission not found'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch admission details'
    });
  }
};

/**
 * Create a new admission
 * POST /api/admissions/create
 */
export const createAdmission = async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let admission_id;

    if (isMultipart) {
      admission_id = await admissionService.createAdmissionFromFormData(
        req.user,
        req.body,
        req.files || []
      );
    } else {
      const { student, parent, admission } = req.body;

      if (!student || !parent || !admission) {
        return res.status(400).json({
          success: false,
          message: 'Missing required data: student, parent, or admission details'
        });
      }

      admission_id = await admissionService.createAdmission(student, parent, admission);
    }
    
    res.status(201).json({
      success: true,
      message: 'Admission created successfully',
      admission_id
    });
  } catch (error) {
    console.error('Error creating admission:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create admission'
    });
  }
};

/**
 * Create admission application from lead
 * POST /api/applications/create
 * Request body: { lead_id, academic_year_id, admission_type, previous_school_name, reason_for_change }
 */
export const createFromLead = async (req, res) => {
  const {
    lead_id,
    academic_year_id,
    admission_type,
    previous_school_name,
    reason_for_change,
  } = req.body;

  try {
    if (!lead_id) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: lead_id is required',
      });
    }

    if (!academic_year_id) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: academic_year_id is required',
      });
    }

    const leadId = BigInt(lead_id);
    const academicYearId = BigInt(academic_year_id);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get lead
      const lead = await tx.lead.findUnique({
        where: {
          id: leadId,
        },
        select: {
          id: true,
          school_id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      });

      if (!lead) {
        throw new Error('Lead not found. Unable to create application.');
      }

      if (!lead.school_id || !lead.first_name || !lead.phone) {
        throw new Error(
          'Lead data incomplete. First name, phone, and school are required.'
        );
      }

      const schoolId = lead.school_id;

      // 2. Check existing admission
      const existingAdmission = await tx.admission.findFirst({
        where: {
          lead_id: leadId,
        },
        orderBy: {
          id: 'desc',
        },
        select: {
          id: true,
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
      });

      if (existingAdmission) {
        const progress = existingAdmission.application_progress;

        const steps = [
          progress?.student_info_status,
          progress?.parent_info_status,
          progress?.academic_details_status,
          progress?.photos_status,
          progress?.documents_status,
          progress?.review_status,
        ];

        let lastCompletedStep = -1;

        for (let i = 0; i < steps.length; i++) {
          if (steps[i] === 'completed') {
            lastCompletedStep = i;
          } else {
            break;
          }
        }

        return {
          existing_application: true,
          application_id: existingAdmission.id,
          last_completed_step: lastCompletedStep,
          progress: {
            student_info_status:
              progress?.student_info_status || 'pending',
            parent_info_status:
              progress?.parent_info_status || 'pending',
            academic_details_status:
              progress?.academic_details_status || 'pending',
            photos_status:
              progress?.photos_status || 'pending',
            documents_status:
              progress?.documents_status || 'pending',
            review_status:
              progress?.review_status || 'pending',
          },
        };
      }

      // 3. Validate academic year
      const academicYear = await tx.academic_year.findFirst({
        where: {
          id: academicYearId,
          school_id: schoolId,
        },
        select: {
          id: true,
        },
      });

      if (!academicYear) {
        throw new Error(
          'Academic year not found or does not belong to this school.'
        );
      }

      // 4. Find existing student by phone
      let student = await tx.student.findFirst({
        where: {
          phone: lead.phone,
          school_id: schoolId,
        },
        select: {
          id: true,
        },
      });

      // 5. Create student if needed
      if (!student) {
        const admissionNumber =
          `ADM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        student = await tx.student.create({
          data: {
            school_id: schoolId,
            admission_number: admissionNumber,
            first_name: lead.first_name,
            last_name: lead.last_name || 'Student',
            email: lead.email || null,
            phone: lead.phone,
            status: 'active',
            created_by: 'admin',
          },
          select: {
            id: true,
          },
        });
      }

      // 6. Get default class
      const schoolClass = await tx.school_class.findFirst({
        where: {
          school_id: schoolId,
        },
        orderBy: {
          class_numeric_value: 'asc',
        },
        select: {
          id: true,
        },
      });

      if (!schoolClass) {
        throw new Error(
          'No classes configured for this school. Please add a class before creating applications.'
        );
      }

      // 7. Get default section
      const section = await tx.section.findFirst({
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
        throw new Error(
          'No sections configured for the default class. Please add a section.'
        );
      }

      // 8. Create admission
      const admission = await tx.admission.create({
        data: {
          school_id: schoolId,
          student_id: student.id,
          lead_id: leadId,
          academic_year_id: academicYearId,
          class_id: schoolClass.id,
          section_id: section.id,
          admission_date: new Date(),
          status: 'draft',
          admission_type: admission_type || 'new',
          previous_school: previous_school_name || null,
          created_by: 'admin',
        },
        select: {
          id: true,
        },
      });

      // 9. Create progress
      await tx.application_progress.create({
        data: {
          admission_id: admission.id,
        },
      });

      return {
        existing_application: false,
        application_id: admission.id,
        student_id: student.id,
      };
    });

    if (result.existing_application) {
      return res.status(200).json({
        success: true,
        existing_application: true,
        application_id: result.application_id,
        last_completed_step: result.last_completed_step,
        progress: result.progress,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        'Application created successfully. You can now proceed with the application form.',
      application_id: result.application_id,
      student_id: result.student_id,
    });
  } catch (error) {
    console.error('Error creating application from lead:', error);

    let errorMessage =
      error.message || 'Failed to create application from lead';

    if (error.code === 'P2002') {
      errorMessage =
        'Duplicate entry: A student with this information already exists.';
    }

    if (error.code === 'P2003') {
      errorMessage =
        'Foreign key error: Referenced school, class, section, or academic year not found.';
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

/**
 * Submit final admission form
 * POST /api/admissions/submit
 */
export const saveAcademicDetails = async (req, res) => {
  const {
    admission_id,
    class_id,
    section_id,
    previous_school,
    admission_type,
  } = req.body;

  if (!admission_id) {
    return res.status(400).json({
      success: false,
      message: 'Admission ID is required',
    });
  }

  try {
    const admissionId = BigInt(admission_id);

    const admission = await prisma.admission.findUnique({
      where: {
        id: admissionId,
      },
    });

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission not found',
      });
    }

    const updatedAdmission = await prisma.admission.update({
      where: {
        id: admissionId,
      },
      data: {
        ...(class_id !== undefined && class_id !== null
          ? { class_id: BigInt(class_id) }
          : {}),
        ...(section_id !== undefined && section_id !== null
          ? { section_id: BigInt(section_id) }
          : {}),
        ...(previous_school !== undefined
          ? { previous_school: previous_school || null }
          : {}),
        ...(admission_type !== undefined
          ? { admission_type: admission_type || null }
          : {}),
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Academic details saved successfully',
      data: updatedAdmission,
    });
  } catch (error) {
    console.error('Error saving academic details:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save academic details',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

/**
 * Upload document for admission
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res) => {
  const { admission_id, document_type, file_name, file_path, file_size, mime_type } = req.body;

  if (!admission_id || !document_type || !file_name || !file_path) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: admission_id, document_type, file_name, file_path'
    });
  }

  try {
        const document = await prisma.documents.create({
          data: {
            admission_id: BigInt(admission_id),
            document_type,
            file_name,
            file_path,
            file_size,
            mime_type,
            uploaded_by: 'admin'
          }
        });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload document'
    });
  }
};


export const submitAdmission = async (req, res) => {
  const { admission_id } = req.body;

  if (!admission_id) {
    return res.status(400).json({
      success: false,
      message: 'Admission ID is required',
    });
  }

  try {
    const admissionId = BigInt(admission_id);

    await prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findUnique({
        where: {
          id: admissionId,
        },
        select: {
          id: true,
        },
      });

      if (!admission) {
        throw new Error('Admission not found');
      }

      await tx.admission.update({
        where: {
          id: admissionId,
        },
        data: {
          status: 'submitted',
          updated_at: new Date(),
        },
      });

      await tx.application_progress.updateMany({
        where: {
          admission_id: admissionId,
        },
        data: {
          review_status: 'completed',
          updated_at: new Date(),
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Admission submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting admission:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit admission',
    });
  }
};


/**
 * Get application progress
 * GET /api/applications/:applicationId/progress
 */
export const getApplicationProgress = async (req, res) => {
  const { applicationId } = req.params;

  try {
    const progress = await prisma.application_progress.findFirst({
        where: {
          admission_id: BigInt(applicationId)
        }
      });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found'
      });
    }

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch progress'
    });
  }
};

/**
 * Update application progress step
 * PUT /api/applications/:applicationId/progress
 */
export const updateApplicationProgress = async (req, res) => {
  const { applicationId } = req.params;
  const { step_name } = req.body;

  if (!step_name) {
    return res.status(400).json({
      success: false,
      message: 'step_name is required'
    });
  }

  const validSteps = [
    'student_info_status',
    'parent_info_status',
    'academic_details_status',
    'photos_status',
    'documents_status',
    'review_status'
  ];

  if (!validSteps.includes(step_name)) {
    return res.status(400).json({
      success: false,
      message: `Invalid step. Valid steps: ${validSteps.join(', ')}`
    });
  }

  try {
      const result = await prisma.application_progress.updateMany({
        where: {
          admission_id: BigInt(applicationId)
        },
        data: {
          [step_name]: 'completed'
        }
      });
    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application progress not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: { update: result.count }
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update progress'
    });
  }
};

export const getEnrollmentStats = async (req, res) => {
  try {
    const stats = await admissionService.getEnrollmentStats(
      req.user.school_id
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching enrollment stats:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch enrollment statistics"
    });
  }
};

/**
 * Save academic details for an admission
 * POST /api/admissions/save-academic
 */

export default {
  getAdmissionStats,
  searchAdmissions,
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  createFromLead,
  getEnrollmentStats,
  submitAdmission,
  uploadDocument,
  getApplicationProgress,
  updateApplicationProgress,
  saveAcademicDetails
};
