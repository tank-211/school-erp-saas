import * as applicationService from '../services/applicationService.js';
import prisma from '../src/lib/prisma.js';
/**
 * Create application from lead
 * POST /api/applications
 */
export const createApplication = async (req, res) => {
  try {
    const { lead_id, academic_year_id } = req.body;
    const { school_id, id: user_id } = req.user; // From authenticated request

    console.log(`📨 POST /api/applications - User: ${user_id}, School: ${school_id}`);
    console.log(`   Body: lead_id=${lead_id}, academic_year_id=${academic_year_id}`);

    if (!lead_id || !academic_year_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lead_id and academic_year_id are required'
      });
    }

    if (!school_id) {
      console.error('❌ school_id not found in token!', req.user);
      return res.status(401).json({
        success: false,
        message: 'Authentication error: school_id not found in JWT token'
      });
    }

    const result = await applicationService.createApplication(lead_id, academic_year_id, school_id);
    
    console.log(`✅ Application created: ${result.id}`);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Application created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating application:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create application'
    });
  }
};

/**
 * Create application without lead
 * POST /api/applications/new
 */
export const createApplicationWithoutLead = async (req, res) => {
  try {
    const { academic_year_id } = req.body;
    const { school_id } = req.user;

    if (!academic_year_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: academic_year_id'
      });
    }

    const result = await applicationService.createApplicationWithoutLead(academic_year_id, school_id);

    return res.status(201).json({
      success: true,
      data: serializeBigInt(result),
      message: 'Application created in manual entry mode'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create application'
    });
  }
};

/**
 * Get eligible leads for creating applications
 * GET /api/applications/eligible-leads
 */
export const getEligibleLeads = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { search, limit } = req.query;

    const leads = await applicationService.getEligibleLeadsForApplication(school_id, {
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch eligible leads',
    });
  }
};

/**
 * Get counts for application dashboard
 * GET /api/applications/counts
 */
export const getApplicationCounts = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counts = await applicationService.getApplicationCounts(school_id);

    return res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch application counts',
    });
  }
};

/**
 * Get applications list
 * GET /api/applications
 */
export const getApplications = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { limit, offset } = req.query;

    const applications = await applicationService.getApplications(school_id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch applications',
    });
  }
};

/**
 * Search applications list
 * GET /api/applications/search?query=...
 */
export const searchApplications = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { query, limit } = req.query;

    if (!query || !String(query).trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const applications = await applicationService.searchApplications(school_id, String(query).trim(), {
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to search applications',
    });
  }
};

/**
 * Get in-progress draft applications
 * GET /api/applications/draft
 */
export const getDraftApplications = async (req, res) => {
  try {
    const { school_id } = req.user;
    const drafts = await applicationService.getDraftApplications(school_id);

    return res.status(200).json({
      success: true,
      data: drafts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch draft applications',
    });
  }
};

/**
 * Resume an in-progress draft application
 * GET /api/applications/:id/resume
 */
export const resumeApplication = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const result = await applicationService.resumeApplication(school_id, id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || 'Draft application not found',
    });
  }
};

/**
 * Get application progress
 * GET /api/applications/:id/progress
 */
export const getApplicationProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await applicationService.getApplicationProgress(id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching application progress:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Application not found'
    });
  }
};

/**
 * Save student info
 * POST /api/applications/:id/student-info
 */
export const saveStudentInfo = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📨 POST /api/applications/${id}/student-info`);
    console.log("Incoming Body:", JSON.stringify(req.body, null, 2));

    const {
      first_name, last_name, middle_name, date_of_birth, dob,
      gender, blood_group, aadhar_number, student_phone, student_email
    } = req.body;

    const studentData = {
      first_name: first_name || req.body.firstName,
      last_name: last_name || req.body.lastName,
      middle_name: middle_name || req.body.middleName,
      date_of_birth: dob || date_of_birth || req.body.dateOfBirth,
      gender: gender,
      blood_group: blood_group || req.body.bloodGroup,
      aadhar_number: aadhar_number || req.body.aadharNumber,
      phone: student_phone || req.body.phone,
      email: student_email || req.body.email
    };

    console.log("Mapped Student Data:", studentData);

    await applicationService.saveStudentInfo(id, studentData);
    res.json({
      success: true,
      message: 'Student information saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving student info:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Save parent info
 * POST /api/applications/:id/parent-info
 */
export const saveParentInfo = async (req, res) => {
  try {
    const { id: applicationId } = req.params;
    // Log incoming request body for debugging
    console.log("Received:", req.body);

    // Destructure and map frontend fields to DB fields
    const {
      fatherName, fatherOccupation, fatherPhone, fatherEmail,
      motherName, motherOccupation, motherPhone, motherEmail,
      guardianName, guardianRelation, guardianPhone, guardianEmail,
      primaryContactPerson, primaryContactRelation, primaryContactPhone,
      address, city, state, postalCode, incomeRange
    } = req.body;

    // Validation
    if (!fatherName || !primaryContactPerson || !primaryContactPhone) {
      return res.status(400).json({
        success: false,
        message: "fatherName, primaryContactPerson, and primaryContactPhone are required"
      });
    }
    if (fatherPhone && !/^[0-9]{10}$/.test(fatherPhone)) {
      return res.status(400).json({ success: false, message: "Father phone must be 10 digits" });
    }
    if (fatherEmail && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(fatherEmail)) {
      return res.status(400).json({ success: false, message: "Invalid father email" });
    }

    // Prepare DB payload (Snake Case)
    const parentData = {
      father_name: fatherName,
      father_occupation: fatherOccupation,
      father_phone: fatherPhone,
      father_email: fatherEmail,
      mother_name: motherName,
      mother_occupation: motherOccupation,
      mother_phone: motherPhone,
      mother_email: motherEmail,
      guardian_name: guardianName,
      guardian_relation: guardianRelation,
      guardian_phone: guardianPhone,
      guardian_email: guardianEmail,
      primary_contact_person: primaryContactPerson,
      primary_contact_relation: primaryContactRelation,
      primary_contact_phone: primaryContactPhone,
      address,
      city,
      state,
      postal_code: postalCode,
      income_range: incomeRange
    };

    console.log("Mapped Parent Data:", parentData);

    await applicationService.saveParentInfo(applicationId, parentData);
    res.json({
      success: true,
      message: 'Parent information saved successfully'
    });
  } catch (error) {
    console.error('Error saving parent info:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Save academic info
 * POST /api/applications/:id/academic-info
 */
export const saveAcademicInfo = async (req, res) => {
  try {
    const applicationId = Number(req.body.application_id ?? req.params.id);
    const tokenSchoolId = Number(req.user?.school_id);
    const schoolId = Number(req.body.school_id ?? tokenSchoolId);

    if (!applicationId || Number.isNaN(applicationId)) {
      return res.status(400).json({ success: false, message: 'Valid application_id is required' });
    }

    if (!schoolId || Number.isNaN(schoolId)) {
      return res.status(400).json({ success: false, message: 'Valid school_id is required' });
    }

    if (tokenSchoolId && schoolId !== tokenSchoolId) {
      return res.status(403).json({ success: false, message: 'school_id does not match authenticated user' });
    }

    if (!req.body.desired_class || !String(req.body.desired_class).trim()) {
      return res.status(400).json({ success: false, message: 'desired_class is required' });
    }

    if (
      req.body.marks_percentage !== undefined
      && req.body.marks_percentage !== null
      && req.body.marks_percentage !== ''
    ) {
      const marks = Number(req.body.marks_percentage);
      if (Number.isNaN(marks) || marks < 0 || marks > 100) {
        return res.status(400).json({ success: false, message: 'marks_percentage must be between 0 and 100' });
      }
    }

    const academicData = {
      desired_class: String(req.body.desired_class).trim(),
      previous_school: req.body.previous_school ?? null,
      previous_class: req.body.previous_class ?? null,
      marks_percentage: req.body.marks_percentage ?? null,
      board_name: req.body.board_name ?? null,
      academic_year: req.body.academic_year ?? null,
      additional_qualifications: req.body.additional_qualifications ?? null,
      extracurricular_activities: req.body.extracurricular_activities ?? null,
      achievements: req.body.achievements ?? null,
    };

    await applicationService.saveAcademicInfo(applicationId, schoolId, academicData);
    res.json({
      success: true,
      message: 'Academic info saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving academic info:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Save documents
 * POST /api/applications/:id/documents
 */
export const saveDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const rawPayload = req.body?.payload ?? req.body;
    const payload = req.validatedPayload
      || (typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload || {});

    await applicationService.saveDocuments(id, payload, req.files || []);

    const invalidTypes = req.documentTypeValidation?.invalidTypes || [];
    const mappedTypes = req.documentTypeValidation?.mappedTypes || [];

    res.json({
      success: true,
      message: 'Documents saved successfully',
      warnings: invalidTypes.length > 0
        ? [
          `Invalid document_type values normalized to other: ${invalidTypes.join(', ')}`,
        ]
        : undefined,
      mapped_types: mappedTypes.length > 0 ? mappedTypes : undefined,
    });
  } catch (error) {
    console.error('Error saving documents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Submit application
 * POST /api/applications/:id/submit
 */
export const submitApplication = async (req, res) => {
  try {
    const { id } = req.params;

    await applicationService.submitApplication(id);
    res.json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get application details
 * GET /api/applications/:id/details
 */
export const getApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id } = req.user;
    const result = await applicationService.getApplicationDetails(id, school_id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const startAdmission = async (req, res) => {
  try {
    const result = await applicationService.startAdmissionApplication(
      req.user.school_id,
      req.body,
    );

    res.status(result.resumed ? 200 : 201).json({
      success: true,
      data: result,
      message: result.resumed
        ? 'Existing draft resumed successfully'
        : 'Admission application started successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to start admission application',
    });
  }
};

export const saveAdmissionStep = async (req, res) => {
  try {
    const result = await applicationService.saveAdmissionStep(
      req.user.school_id,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Step data saved successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to save step data',
    });
  }
};

export const getAdmissionApplication = async (req, res) => {
  try {
    const result = await applicationService.getAdmissionApplicationById(
      req.user.school_id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Admission application not found',
    });
  }
};

export const completeAdmission = async (req, res) => {
  try {
    const { admission_id } = req.body;

    const result = await applicationService.completeAdmissionApplication(
      req.user.school_id,
      admission_id,
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Admission confirmed successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete admission application',
    });
  }
};

/**
 * Delete application
 * DELETE /api/applications/:id
 * Validates that application status is 'draft' before allowing deletion
 */
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id } = req.user;

    console.log(`🗑️  DELETE /api/applications/${id} - User: ${req.user.id}, School: ${school_id}`);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    const result = await applicationService.deleteApplication(school_id, id);

    console.log(`✅ Application ${id} deleted successfully`);
    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error deleting application:', error.message);
    
    // Return appropriate status codes based on error type
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete application'
    });
  }
};
