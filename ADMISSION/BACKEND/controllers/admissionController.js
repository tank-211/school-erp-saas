import * as admissionService from '../services/admissionService.js';
import pool from '../config/db.js';

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
  const { lead_id, academic_year_id, admission_type, previous_school_name, reason_for_change } = req.body;
  const client = await pool.connect();

  try {
    // === STEP 1: Validate required fields ===
    if (!lead_id) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: lead_id is required'
      });
    }

    if (!academic_year_id) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: academic_year_id is required'
      });
    }

    await client.query('BEGIN');

    // === STEP 2: Fetch and validate lead data ===
    const leadResult = await client.query(
      'SELECT id, school_id, first_name, last_name, email, phone FROM lead WHERE id = $1',
      [lead_id]
    );

    if (leadResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Lead not found. Unable to create application.'
      });
    }

    const lead = leadResult.rows[0];

    // Validate lead has essential data
    if (!lead.school_id || !lead.first_name || !lead.phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Lead data incomplete. First name, phone, and school are required.'
      });
    }

    // === STEP 3: Check for duplicate admission (SMART LOGIC - Don't error, return existing) ===
    const duplicateCheck = await client.query(
      `SELECT a.id, ap.student_info_status, ap.parent_info_status, ap.academic_details_status, 
              ap.photos_status, ap.documents_status, ap.review_status
       FROM admission a
       LEFT JOIN application_progress ap ON a.id = ap.admission_id
       WHERE a.lead_id = $1`,
      [lead_id]
    );

    if (duplicateCheck.rows.length > 0) {
      // Application already exists - Return success with existing_application flag
      const existingAdmission = duplicateCheck.rows[0];
      
      // Calculate last completed step (0-indexed)
      const steps = [
        existingAdmission.student_info_status,
        existingAdmission.parent_info_status,
        existingAdmission.academic_details_status,
        existingAdmission.photos_status,
        existingAdmission.documents_status,
        existingAdmission.review_status
      ];
      
      let lastCompletedStep = -1;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i] === 'completed') {
          lastCompletedStep = i;
        } else {
          break;
        }
      }

      await client.query('ROLLBACK');
      
      return res.status(200).json({
        success: true,
        existing_application: true,
        application_id: existingAdmission.id,
        last_completed_step: lastCompletedStep,
        progress: {
          student_info_status: existingAdmission.student_info_status,
          parent_info_status: existingAdmission.parent_info_status,
          academic_details_status: existingAdmission.academic_details_status,
          photos_status: existingAdmission.photos_status,
          documents_status: existingAdmission.documents_status,
          review_status: existingAdmission.review_status
        }
      });
    }

    // === STEP 4: Find or create student ===
    let student_id;
    
    // Search by phone only (email might be NULL)
    const studentCheckResult = await client.query(
      'SELECT id FROM student WHERE phone = $1 AND school_id = $2',
      [lead.phone, lead.school_id]
    );

    if (studentCheckResult.rows.length > 0) {
      student_id = studentCheckResult.rows[0].id;
    } else {
      // Create new student record with unique admission number
      const uniqueAdmissionNumber = `ADM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const studentInsert = await client.query(
        `INSERT INTO student (school_id, admission_number, first_name, last_name, email, phone, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [lead.school_id, uniqueAdmissionNumber, lead.first_name, lead.last_name, lead.email || null, lead.phone, 'active', 'admin']
      );
      student_id = studentInsert.rows[0].id;
    }

    // === STEP 5: Validate academic_year belongs to the school ===
    const academicYearCheck = await client.query(
      'SELECT id FROM academic_year WHERE id = $1 AND school_id = $2',
      [academic_year_id, lead.school_id]
    );

    if (academicYearCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Academic year not found or does not belong to this school.'
      });
    }

    // === STEP 6: Get default class (use first class by numeric value) ===
    const classCheck = await client.query(
      'SELECT id FROM school_class WHERE school_id = $1 ORDER BY class_numeric_value ASC LIMIT 1',
      [lead.school_id]
    );

    if (classCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No classes configured for this school. Please add a class before creating applications.'
      });
    }

    const class_id = classCheck.rows[0].id;

    // === STEP 7: Get default section for the selected class ===
    const sectionCheck = await client.query(
      'SELECT id FROM section WHERE class_id = $1 ORDER BY section_name ASC LIMIT 1',
      [class_id]
    );

    if (sectionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No sections configured for the default class. Please add a section.'
      });
    }

    const section_id = sectionCheck.rows[0].id;

    // === STEP 8: Create admission record ===
    const admissionInsert = await client.query(
      `INSERT INTO admission 
       (school_id, student_id, lead_id, academic_year_id, class_id, section_id, admission_date, status, admission_type, previous_school, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10) RETURNING id`,
      [lead.school_id, student_id, lead_id, academic_year_id, class_id, section_id, 'draft', admission_type || 'new', previous_school_name || null, 'admin']
    );

    const admission_id = admissionInsert.rows[0].id;

    // === STEP 9: Create application progress record ===
    await client.query(
      `INSERT INTO application_progress (admission_id)
       VALUES ($1)`,
      [admission_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Application created successfully. You can now proceed with the application form.',
      application_id: admission_id,
      student_id: student_id
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    
    console.error('============ ERROR creating from lead ============');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Full error:', error);
    console.error('=============================================');
    
    // Provide specific error messages based on constraint violations
    let errorMessage = 'Failed to create application from lead';
    let statusCode = 500;
    
    if (error.code === '23505') {
      errorMessage = 'Duplicate entry: A student with this phone number or email already exists.';
    } else if (error.code === '23503') {
      errorMessage = 'Foreign key error: Referenced school, class, section, or academic year not found.';
    } else if (error.code === '23514') {
      errorMessage = 'Check constraint violation: Invalid status or admission type.';
    } else if (error.message.includes('admission_type_check')) {
      errorMessage = 'Invalid admission type. Use: new, transfer, or regular.';
    } else if (error.message.includes('status')) {
      errorMessage = 'Database status constraint error. Please contact support.';
    } else if (error.message.includes('unique')) {
      errorMessage = 'A student with this information already exists.';
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Submit final admission form
 * POST /api/admissions/submit
 */
export const submitAdmission = async (req, res) => {
  const { admission_id } = req.body;
  const client = await pool.connect();
  
  if (!admission_id) {
    return res.status(400).json({ success: false, message: 'Admission ID is required' });
  }

  try {
    await client.query('BEGIN');

    // Update admission status to submitted
    const result = await client.query(
      `UPDATE admission SET status = 'submitted' WHERE id = $1 RETURNING id`,
      [admission_id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    // Update application progress review status
    await client.query(
      `UPDATE application_progress SET review_status = 'completed' WHERE admission_id = $1`,
      [admission_id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Admission submitted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting admission:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit admission'
    });
  } finally {
    client.release();
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

/**
 * Save academic details for an admission
 * POST /api/admissions/save-academic
 */
export const saveAcademicDetails = async (req, res) => {
  const { admission_id, class_id, section_id, previous_school, admission_type } = req.body;

  if (!admission_id) {
    return res.status(400).json({
      success: false,
      message: 'Admission ID is required'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update admission with academic details
    const result = await client.query(
      `UPDATE admission 
       SET class_id = COALESCE($1, class_id),
           section_id = COALESCE($2, section_id),
           previous_school = COALESCE($3, previous_school),
           admission_type = COALESCE($4, admission_type),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [class_id || null, section_id || null, previous_school || null, admission_type || null, admission_id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Admission not found'
      });
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Academic details saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving academic details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save academic details',
      error: error.message
    });
  } finally {
    client.release();
  }
};

export default {
  getAdmissionStats,
  searchAdmissions,
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  createFromLead,
  submitAdmission,
  uploadDocument,
  getApplicationProgress,
  updateApplicationProgress,
  saveAcademicDetails
};
