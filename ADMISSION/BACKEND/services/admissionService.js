import pool from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';

/** 
 * Get admission statistics
 * Returns the total number of records from the admission table
 */
export const getAdmissionStats = async (schoolId) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'submitted') AS submitted,
        COUNT(*) FILTER (WHERE LOWER(status) = 'under_review') AS under_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'approved') AS approved,
        COUNT(*) FILTER (WHERE LOWER(status) = 'waitlisted') AS waitlisted
      FROM admission
      WHERE school_id = $1;
    `, [schoolId]);
    
    const row = result.rows[0];
    return {
      total: parseInt(row.total || 0, 10),
      submitted: parseInt(row.submitted || 0, 10),
      under_review: parseInt(row.under_review || 0, 10),
      approved: parseInt(row.approved || 0, 10),
      waitlisted: parseInt(row.waitlisted || 0, 10)
    };
  } catch (error) {
    throw new Error(`Failed to fetch admission stats: ${error.message}`);
  }
};

/**
 * Search admissions by student name or parent contact
 * @param {string} query - Search query (student name or parent phone)
 * @returns {Array} Array of matching admissions
 */
export const searchAdmissions = async (schoolId, query) => {
  try {
    const searchQuery = `%${query}%`;
    
    const result = await pool.query(`
      SELECT DISTINCT
        a.id as application_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        sc.class_name as grade,
        COALESCE(pd.phone, 'N/A') as parent_contact,
        a.created_at as submitted_date,
        a.status
      FROM admission a
      JOIN student s ON a.student_id = s.id
      JOIN school_class sc ON a.class_id = sc.id
      LEFT JOIN parent_detail pd ON s.id = pd.student_id
      WHERE
        a.school_id = $1
        AND (
        s.first_name ILIKE $2 OR 
        s.last_name ILIKE $2 OR
        CONCAT(s.first_name, ' ', s.last_name) ILIKE $2 OR
        pd.phone ILIKE $2
        )
      ORDER BY a.created_at DESC
      LIMIT 100
    `, [schoolId, searchQuery]);
    
    // Format the response
    return result.rows.map(row => ({
      application_id: row.application_id,
      student_name: row.student_name,
      grade: row.grade,
      parent_contact: row.parent_contact || 'N/A',
      submitted_date: row.submitted_date ? row.submitted_date.toISOString().split('T')[0] : 'N/A',
      status: row.status
    }));
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
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
    const countResult = await pool.query('SELECT COUNT(*) FROM admission WHERE school_id = $1', [schoolId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(`
      SELECT 
        a.id as application_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        sc.class_name as grade,
        COALESCE(pd.phone, 'N/A') as parent_contact,
        a.created_at as submitted_date,
        a.status
      FROM admission a
      JOIN student s ON a.student_id = s.id
      JOIN school_class sc ON a.class_id = sc.id
      LEFT JOIN parent_detail pd ON s.id = pd.student_id
      WHERE a.school_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `, [schoolId, limit, offset]);

    return {
      data: result.rows.map(row => ({
        application_id: row.application_id,
        student_name: row.student_name,
        grade: row.grade,
        parent_contact: row.parent_contact || 'N/A',
        submitted_date: row.submitted_date ? row.submitted_date.toISOString().split('T')[0] : 'N/A',
        status: row.status
      })),
      total,
      limit,
      offset
    };
  } catch (error) {
    throw new Error(`Failed to fetch admissions: ${error.message}`);
  }
};

/**
 * Get admission details by application ID
 * @param {string} applicationId - Application ID
 * @returns {Object} Admission details
 */
export const getAdmissionById = async (schoolId, applicationId) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id as application_id,
        a.school_id,
        a.student_id,
        a.academic_year_id,
        a.class_id,
        a.section_id,
        a.admission_date,
        a.status,
        a.admission_type,
        a.registration_number,
        a.previous_school,
        s.id,
        s.first_name,
        s.last_name,
        s.date_of_birth,
        s.gender,
        s.aadhar_number,
        s.phone,
        s.email,
        sc.class_name,
        sec.section_name,
        pd.first_name as parent_first_name,
        pd.last_name as parent_last_name,
        pd.phone as parent_phone,
        pd.relation,
        pd.email as parent_email,
        pd.occupation
      FROM admission a
      JOIN student s ON a.student_id = s.id
      JOIN school_class sc ON a.class_id = sc.id
      JOIN section sec ON a.section_id = sec.id
      LEFT JOIN parent_detail pd ON s.id = pd.student_id
      WHERE a.school_id = $1 AND a.id = $2
    `, [schoolId, applicationId]);

    if (result.rows.length === 0) {
      throw new Error('Admission not found');
    }

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to fetch admission details: ${error.message}`);
  }
};

export const createAdmission = async (studentData, parentData, admissionData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into student
    const studentQuery = `
      INSERT INTO student (
        school_id, admission_number, first_name, last_name, date_of_birth, gender, email, phone, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING id
    `;
    const stdVals = [
      admissionData.school_id || 1, // Defaulting to 1 if not passed for MVP
      admissionData.admission_number || `ADM-${Date.now()}`,
      studentData.first_name,
      studentData.last_name,
      studentData.date_of_birth || null,
      studentData.gender || 'Other',
      studentData.email || null,
      studentData.phone || null
    ];
    const studentRes = await client.query(studentQuery, stdVals);
    const studentId = studentRes.rows[0].id;

    // 2. Insert into parent_detail
    const parentQuery = `
      INSERT INTO parent_detail (
        school_id, student_id, relation, first_name, last_name, email, phone, occupation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const parentVals = [
      admissionData.school_id || 1,
      studentId,
      parentData.relation || 'Father', 
      parentData.first_name,
      parentData.last_name || null,
      parentData.email || null,
      parentData.phone,
      parentData.occupation || null
    ];
    await client.query(parentQuery, parentVals);

    // 3. Insert into admission
    const admissionInsertQuery = `
      INSERT INTO admission (
        school_id, student_id, academic_year_id, class_id, section_id, admission_date, status, admission_type
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 'new')
      RETURNING id
    `;
    const admissionVals = [
      admissionData.school_id || 1,
      studentId,
      admissionData.academic_year_id || 1, // Ensure default available IDs if front-end lacks dropdown configs initially
      admissionData.class_id || 1,
      admissionData.section_id || 1,
      admissionData.admission_date || new Date().toISOString().split('T')[0]
    ];
    const admissionRes = await client.query(admissionInsertQuery, admissionVals);
    const newAdmissionId = admissionRes.rows[0].id;

    await client.query('COMMIT');
    return newAdmissionId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to create admission: ${error.message}`);
  } finally {
    client.release();
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

async function resolveSchoolContext(client, user, body) {
  if (body.lead_id) {
    const leadResult = await client.query(
      `SELECT id, school_id, academic_year_id, desired_class
       FROM lead
       WHERE id = $1 AND school_id = $2`,
      [body.lead_id, user.school_id]
    );

    if (leadResult.rows.length === 0) {
      throw new Error('Lead not found for this school');
    }

    return leadResult.rows[0];
  }

  return {
    id: null,
    school_id: user.school_id,
    academic_year_id: null,
    desired_class: body.grade_applied_for || null,
  };
}

async function resolveAcademicYearId(client, schoolId, academicYearLabel, leadAcademicYearId) {
  if (leadAcademicYearId) {
    return leadAcademicYearId;
  }

  const normalizedLabel = parseAcademicYearLabel(academicYearLabel);

  if (normalizedLabel) {
    const yearByName = await client.query(
      `SELECT id
       FROM academic_year
       WHERE school_id = $1 AND (year_name = $2 OR REPLACE(year_name, ' ', '') = REPLACE($2, ' ', ''))
       ORDER BY is_active DESC, id DESC
       LIMIT 1`,
      [schoolId, normalizedLabel]
    );

    if (yearByName.rows.length > 0) {
      return yearByName.rows[0].id;
    }
  }

  const fallbackYear = await client.query(
    `SELECT id
     FROM academic_year
     WHERE school_id = $1
     ORDER BY is_active DESC, id DESC
     LIMIT 1`,
    [schoolId]
  );

  if (fallbackYear.rows.length === 0) {
    throw new Error('No academic year configured for this school');
  }

  return fallbackYear.rows[0].id;
}

async function resolveClassAndSection(client, schoolId, desiredClassLabel) {
  const numericValue = extractClassNumericValue(desiredClassLabel || '');

  let classResult;
  if (numericValue !== null) {
    classResult = await client.query(
      `SELECT id, class_name
       FROM school_class
       WHERE school_id = $1 AND class_numeric_value = $2
       ORDER BY id ASC
       LIMIT 1`,
      [schoolId, numericValue]
    );
  }

  if (!classResult || classResult.rows.length === 0) {
    classResult = await client.query(
      `SELECT id, class_name
       FROM school_class
       WHERE school_id = $1
       ORDER BY class_numeric_value ASC, id ASC
       LIMIT 1`,
      [schoolId]
    );
  }

  if (classResult.rows.length === 0) {
    throw new Error('No classes configured for this school');
  }

  const classId = classResult.rows[0].id;
  const sectionResult = await client.query(
    `SELECT id
     FROM section
     WHERE school_id = $1 AND class_id = $2
     ORDER BY section_name ASC, id ASC
     LIMIT 1`,
    [schoolId, classId]
  );

  if (sectionResult.rows.length === 0) {
    throw new Error('No section configured for the selected class');
  }

  return {
    classId,
    sectionId: sectionResult.rows[0].id,
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

async function insertUploadedDocuments(client, admissionId, files, uploadedBy) {
  for (const file of files) {
    const documentType = documentTypeMap[file.fieldname] || 'other';

    await client.query(
      `INSERT INTO documents
       (admission_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        admissionId,
        documentType,
        file.originalname,
        file.relativePath || buildUploadedFilePath(file.filename),
        file.size || null,
        file.mimetype || null,
        String(uploadedBy),
      ]
    );
  }
}

export const createAdmissionFromFormData = async (user, body, files = []) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const leadContext = await resolveSchoolContext(client, user, body);
    const schoolId = leadContext.school_id;
    const academicYearId = await resolveAcademicYearId(
      client,
      schoolId,
      body.academic_year,
      leadContext.academic_year_id
    );
    const desiredClass = body.grade_applied_for || leadContext.desired_class || 'Class 1';
    const { classId, sectionId } = await resolveClassAndSection(client, schoolId, desiredClass);

    const admissionNumber = `ADM-${new Date().getFullYear()}-${Date.now()}`;
    const studentResult = await client.query(
      `INSERT INTO student (
        school_id, admission_number, first_name, last_name, date_of_birth, gender, email, phone,
        address, city, state, postal_code, country, blood_group, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING id`,
      [
        schoolId,
        admissionNumber,
        toTitleCase(body.student_first_name || ''),
        toTitleCase(body.student_last_name || ''),
        body.dob || null,
        body.gender || 'Other',
        body.student_email || null,
        normalizeDigits(body.student_phone || ''),
        body.street_address || null,
        body.city || null,
        body.state || null,
        body.pincode || null,
        body.nationality || 'India',
        body.blood_group || null,
        String(user.id),
      ]
    );

    const studentId = studentResult.rows[0].id;

    const parentRows = [
      {
        relation: 'Father',
        first_name: toTitleCase(body.father_name || ''),
        email: body.father_email || null,
        phone: normalizeDigits(body.father_phone || ''),
        occupation: body.father_occupation || null,
      },
      {
        relation: 'Mother',
        first_name: toTitleCase(body.mother_name || ''),
        email: body.mother_email || null,
        phone: normalizeDigits(body.mother_phone || ''),
        occupation: body.mother_occupation || null,
      },
    ].filter((row) => row.first_name && row.phone);

    for (const parent of parentRows) {
      await client.query(
        `INSERT INTO parent_detail
         (school_id, student_id, relation, first_name, email, phone, occupation, address, city, income_range)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          schoolId,
          studentId,
          parent.relation,
          parent.first_name,
          parent.email,
          parent.phone,
          parent.occupation,
          body.street_address || null,
          body.city || null,
          null,
        ]
      );
    }

    const admissionResult = await client.query(
      `INSERT INTO admission
       (school_id, student_id, lead_id, academic_year_id, class_id, section_id, admission_date, status, admission_type, previous_school, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'submitted', $7, $8, $9)
       RETURNING id`,
      [
        schoolId,
        studentId,
        leadContext.id,
        academicYearId,
        classId,
        sectionId,
        ['new', 'transfer', 'regular'].includes(body.admission_type) ? body.admission_type : 'new',
        body.previous_school || null,
        String(user.id),
      ]
    );

    const admissionId = admissionResult.rows[0].id;

    await client.query(
      `INSERT INTO application_progress
       (admission_id, student_info_status, parent_info_status, academic_details_status, photos_status, documents_status, review_status)
       VALUES ($1, 'completed', 'completed', 'completed', $2, $3, 'completed')`,
      [
        admissionId,
        files.some((file) => file.fieldname.startsWith('photo_')) ? 'completed' : 'pending',
        files.some((file) => file.fieldname.startsWith('doc_')) ? 'completed' : 'pending',
      ]
    );

    const movedFiles = await moveFilesToAdmissionFolder(admissionId, files);
    await insertUploadedDocuments(client, admissionId, movedFiles, user.id);

    await client.query('COMMIT');
    return admissionId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to create admission: ${error.message}`);
  } finally {
    client.release();
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
