import path from 'path';
import { unlink } from 'fs/promises';
import pool from '../config/db.js';
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

const ensureApplicationFileConstraints = async (client) => {
  await client.query(`
    ALTER TABLE application_documents
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS document_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS uploaded_by BIGINT,
      ADD COLUMN IF NOT EXISTS verified_by BIGINT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await client.query(`
    ALTER TABLE application_documents
      ALTER COLUMN file_name DROP NOT NULL,
      ALTER COLUMN file_path DROP NOT NULL
  `);

  await client.query(`
    ALTER TABLE application_documents
      DROP CONSTRAINT IF EXISTS unique_application_documents,
      DROP CONSTRAINT IF EXISTS unique_application_documents_application_document_type,
      DROP CONSTRAINT IF EXISTS unique_application_documents_application,
      DROP CONSTRAINT IF EXISTS application_documents_application_id_fkey,
      DROP CONSTRAINT IF EXISTS application_documents_uploaded_by_fkey,
      DROP CONSTRAINT IF EXISTS application_documents_verified_by_fkey,
      DROP CONSTRAINT IF EXISTS fk_app_docs_app,
      DROP CONSTRAINT IF EXISTS fk_app_docs_uploaded,
      DROP CONSTRAINT IF EXISTS fk_app_docs_verified,
        DROP CONSTRAINT IF EXISTS application_documents_document_type_check,
        DROP CONSTRAINT IF EXISTS check_document_type
  `);

  await client.query(`
    ALTER TABLE application_documents
      ADD CONSTRAINT application_documents_application_id_fkey
        FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
      ADD CONSTRAINT application_documents_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES app_user(id) ON DELETE SET NULL,
      ADD CONSTRAINT application_documents_verified_by_fkey
        FOREIGN KEY (verified_by) REFERENCES app_user(id) ON DELETE SET NULL,
      ADD CONSTRAINT application_documents_document_type_check
        CHECK (
          document_type IN (
            ${APPLICATION_DOCUMENT_TYPES_SQL}
          )
        )
  `);

  await client.query(`
    ALTER TABLE application_photos
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await client.query(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY application_id, document_type
               ORDER BY updated_at DESC NULLS LAST,
                        created_at DESC NULLS LAST,
                        id DESC
             ) AS rn
      FROM application_documents
    )
    DELETE FROM application_documents d
    USING ranked r
    WHERE d.id = r.id
      AND r.rn > 1
  `);

  await client.query(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY application_id, photo_type
               ORDER BY updated_at DESC NULLS LAST,
                        created_at DESC NULLS LAST,
                        id DESC
             ) AS rn
      FROM application_photos
    )
    DELETE FROM application_photos p
    USING ranked r
    WHERE p.id = r.id
      AND r.rn > 1
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_app_id_and_type'
          AND conrelid = 'application_documents'::regclass
      ) THEN
        ALTER TABLE application_documents
          ADD CONSTRAINT unique_app_id_and_type UNIQUE (application_id, document_type);
      END IF;
    END $$;
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_application_photos_application_photo_type'
          AND conrelid = 'application_photos'::regclass
      ) THEN
        ALTER TABLE application_photos
          ADD CONSTRAINT unique_application_photos_application_photo_type UNIQUE (application_id, photo_type);
      END IF;
    END $$;
  `);
};

/**
 * Create a new application from lead
 * POST /api/applications
 */
export const createApplication = async (leadId, academicYearId, schoolId) => {
  let client;
  try {
    // Validate inputs
    if (!leadId || !academicYearId || !schoolId) {
      throw new Error(`Missing required fields: leadId=${leadId}, academicYearId=${academicYearId}, schoolId=${schoolId}`);
    }

    console.log(`📝 Creating application - Lead: ${leadId}, Year: ${academicYearId}, School: ${schoolId}`);

    // Use transaction for safety
    client = await pool.connect();
    await client.query('BEGIN');

    // Verify lead exists
    const leadCheck = await client.query('SELECT id FROM lead WHERE id = $1 AND school_id = $2', [leadId, schoolId]);
    if (leadCheck.rows.length === 0) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    // Prevent creating a new application when a submitted application already exists for this lead.
    const submittedCheck = await client.query(
      `SELECT id
       FROM application
       WHERE school_id = $1
         AND lead_id = $2
         AND status = 'submitted'
       LIMIT 1`,
      [schoolId, leadId],
    );

    if (submittedCheck.rows.length > 0) {
      throw new Error('A submitted application already exists for this lead');
    }

    // Verify academic year exists
    const yearCheck = await client.query('SELECT id FROM academic_year WHERE id = $1', [academicYearId]);
    if (yearCheck.rows.length === 0) {
      throw new Error(`Academic year with ID ${academicYearId} not found`);
    }

    // Verify school exists
    const schoolCheck = await client.query('SELECT id FROM school WHERE id = $1', [schoolId]);
    if (schoolCheck.rows.length === 0) {
      throw new Error(`School with ID ${schoolId} not found`);
    }

    // Generate a unique application number using timestamp
    const appNumber = `APP-${new Date().getFullYear()}-${Date.now()}`;

    // Create application
    const query = `
      INSERT INTO application (school_id, lead_id, academic_year_id, application_number, current_step, status)
      VALUES ($1, $2, $3, $4, 1, 'in_progress')
      RETURNING id, current_step, status, created_at;
    `;
    
    const result = await client.query(query, [schoolId, leadId, academicYearId, appNumber]);
    const applicationId = result.rows[0].id;

    console.log(`✅ Application created with ID: ${applicationId}`);

    // Note: application_progress tracking is handled separately via migration (app_progress table)

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('❌ Error creating application:', error.message);
    throw new Error(`Failed to create application: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const createApplicationWithoutLead = async (academicYearId, schoolId) => {
  let client;
  try {
    if (!academicYearId || !schoolId) {
      throw new Error(`Missing required fields: academicYearId=${academicYearId}, schoolId=${schoolId}`);
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const yearCheck = await client.query(
      'SELECT id FROM academic_year WHERE id = $1 AND school_id = $2',
      [academicYearId, schoolId],
    );
    if (yearCheck.rows.length === 0) {
      throw new Error(`Academic year with ID ${academicYearId} not found`);
    }

    const appNumber = `APP-${new Date().getFullYear()}-${Date.now()}`;

    const result = await client.query(
      `INSERT INTO application (school_id, lead_id, academic_year_id, application_number, current_step, status)
       VALUES ($1, NULL, $2, $3, 1, 'in_progress')
       RETURNING id, lead_id, current_step, status, created_at`,
      [schoolId, academicYearId, appNumber],
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw new Error(`Failed to create application: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const getApplicationCounts = async (schoolId) => {
  const result = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
       COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
       COUNT(*) FILTER (WHERE status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE status = 'waitlisted') AS waitlisted,
       COUNT(*) FILTER (WHERE status IN ('in_progress', 'draft')) AS draft
     FROM application
     WHERE school_id = $1`,
    [schoolId],
  );

  const row = result.rows[0] || {};
  return {
    total: Number(row.total || 0),
    submitted: Number(row.submitted || 0),
    under_review: Number(row.under_review || 0),
    approved: Number(row.approved || 0),
    waitlisted: Number(row.waitlisted || 0),
    draft: Number(row.draft || 0),
  };
};

export const getDraftApplications = async (schoolId) => {
  const result = await pool.query(
    `SELECT
       a.id,
       TRIM(CONCAT(COALESCE(asi.first_name, ''), ' ', COALESCE(asi.last_name, ''))) AS student_name,
       a.current_step,
       a.updated_at,
       a.status
     FROM application a
     LEFT JOIN application_student_info asi ON asi.application_id = a.id
     WHERE school_id = $1
       AND status IN ('in_progress', 'draft')
     ORDER BY updated_at DESC`,
    [schoolId],
  );

  return result.rows;
};

export const getApplications = async (schoolId, options = {}) => {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 100;
  const offset = Number.isInteger(options.offset) && options.offset >= 0 ? options.offset : 0;

  const result = await pool.query(
    `SELECT
       a.id,
       a.application_number,
       a.status,
       a.current_step,
       a.updated_at,
       a.submitted_at,
       CONCAT(COALESCE(asi.first_name, l.first_name, ''), ' ', COALESCE(asi.last_name, l.last_name, '')) AS student_name,
       COALESCE(aai.desired_class, l.desired_class) AS grade,
       COALESCE(api.primary_contact_phone, api.father_phone, l.phone) AS parent_contact
     FROM application a
     LEFT JOIN application_student_info asi ON asi.application_id = a.id
     LEFT JOIN application_parent_info api ON api.application_id = a.id
     LEFT JOIN application_academic_info aai ON aai.application_id = a.id
     LEFT JOIN lead l ON l.id = a.lead_id
     WHERE a.school_id = $1
     ORDER BY a.updated_at DESC
     LIMIT $2 OFFSET $3`,
    [schoolId, limit, offset],
  );

  return result.rows;
};

export const searchApplications = async (schoolId, queryText, options = {}) => {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 100;

  const result = await pool.query(
    `SELECT
       a.id,
       a.application_number,
       a.status,
       a.current_step,
       a.updated_at,
       a.submitted_at,
       CONCAT(COALESCE(asi.first_name, l.first_name, ''), ' ', COALESCE(asi.last_name, l.last_name, '')) AS student_name,
       COALESCE(aai.desired_class, l.desired_class) AS grade,
       COALESCE(api.primary_contact_phone, api.father_phone, l.phone) AS parent_contact
     FROM application a
     LEFT JOIN application_student_info asi ON asi.application_id = a.id
     LEFT JOIN application_parent_info api ON api.application_id = a.id
     LEFT JOIN application_academic_info aai ON aai.application_id = a.id
     LEFT JOIN lead l ON l.id = a.lead_id
     WHERE a.school_id = $1
       AND (
         CAST(a.id AS TEXT) ILIKE $2
         OR a.application_number ILIKE $2
         OR CONCAT(COALESCE(asi.first_name, l.first_name, ''), ' ', COALESCE(asi.last_name, l.last_name, '')) ILIKE $2
         OR COALESCE(api.primary_contact_phone, api.father_phone, l.phone, '') ILIKE $2
       )
     ORDER BY a.updated_at DESC
     LIMIT $3`,
    [schoolId, `%${queryText}%`, limit],
  );

  return result.rows;
};

export const getEligibleLeadsForApplication = async (schoolId, filters = {}) => {
  const { search, limit } = filters;
  const params = [schoolId];

  let query = `
    SELECT l.*
    FROM lead l
    WHERE l.school_id = $1
      AND NOT EXISTS (
        SELECT 1
        FROM admission a
        WHERE a.lead_id = l.id
          AND a.status IN ('submitted', 'draft')
      )
  `;

  if (search) {
    params.push(`%${search}%`);
    query += `
      AND (
        l.first_name ILIKE $${params.length}
        OR l.last_name ILIKE $${params.length}
        OR CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')) ILIKE $${params.length}
        OR l.email ILIKE $${params.length}
        OR l.phone ILIKE $${params.length}
      )
    `;
  }

  query += ' ORDER BY l.created_at DESC';

  if (Number.isInteger(limit) && limit > 0) {
    params.push(limit);
    query += ` LIMIT $${params.length}`;
  }

  const result = await pool.query(query, params);
  return result.rows;
};

export const resumeApplication = async (schoolId, applicationId) => {
  const query = `
    SELECT a.id, a.school_id, a.lead_id, a.academic_year_id, a.current_step, a.status, a.updated_at
    FROM application a
    WHERE a.school_id = $1
      AND a.id = $2
      AND a.status = 'in_progress'
    LIMIT 1
  `;

  const result = await pool.query(query, [schoolId, applicationId]);

  if (!result.rows.length) {
    throw new Error('Draft application not found');
  }

  return result.rows[0];
};

/**
 * Get application progress
 * GET /api/applications/:id/progress
 */
export const getApplicationProgress = async (applicationId) => {
  try {
    // Derive progress from current_step on the application table
    // (avoids joining the legacy application_progress table which has wrong column names)
    const query = `
      SELECT 
        a.id,
        a.current_step,
        a.status
      FROM application a
      WHERE a.id = $1;
    `;

    const result = await pool.query(query, [applicationId]);
    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    const app = result.rows[0];
    const step = parseInt(app.current_step, 10);

    return {
      id: app.id,
      current_step: step,
      status: app.status,
      steps: {
        student_info:  step > 1 ? 'completed' : 'pending',
        parent_info:   step > 2 ? 'completed' : 'pending',
        academic_info: step > 3 ? 'completed' : 'pending',
        photos:        step > 4 ? 'completed' : 'pending',
        documents:     step > 5 ? 'completed' : 'pending',
        review:        app.status === 'submitted' ? 'completed' : 'pending',
      }
    };
  } catch (error) {
    throw new Error(`Failed to get application progress: ${error.message}`);
  }
};


/**
 * Save student info (Step 1)
 * POST /api/applications/:id/student-info
 */
export const saveStudentInfo = async (applicationId, studentData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log(`📝 Saving Student Info for App: ${applicationId}`);
    
    // Schema columns: application_id, first_name, last_name, middle_name, date_of_birth, gender, blood_group, aadhar_number, phone, email
    const query = `
      INSERT INTO application_student_info
      (application_id, first_name, last_name, middle_name, date_of_birth, gender, blood_group, aadhar_number, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (application_id) DO UPDATE
      SET first_name = $2, last_name = $3, middle_name = $4, date_of_birth = $5, gender = $6,
          blood_group = $7, aadhar_number = $8, phone = $9, email = $10, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      applicationId,
      studentData.first_name || 'Student',
      studentData.last_name || studentData.first_name || 'Name',
      studentData.middle_name || null,
      studentData.date_of_birth || studentData.dob || new Date().toISOString().split('T')[0],
      studentData.gender || 'Other',
      studentData.blood_group || null,
      studentData.aadhar_number || null,
      studentData.phone || null,
      studentData.email || null
    ];

    console.log("SQL Values Student:", JSON.stringify(values));
    await client.query(query, values);

    // Advance current_step to 2
    await client.query(
      `UPDATE application SET current_step = GREATEST(current_step, 2), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [applicationId]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Student info saved' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ SQL Error in saveStudentInfo:', error.message);
    throw new Error(`Failed to save student info: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Save parent info (Step 2)
 * POST /api/applications/:id/parent-info
 */
export const saveParentInfo = async (applicationId, parentData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log(`📝 Saving Parent Info for App: ${applicationId}`);

    // Map guardian relation carefully due to CHECK constraint
    const allowedRelations = ['Other Relative', 'Family Friend', 'Court Appointed', 'Other'];
    let gRelation = parentData.guardian_relation || 'Other';
    if (!allowedRelations.includes(gRelation)) {
      gRelation = 'Other';
    }

    const primaryContact = parentData.primary_contact_person || parentData.father_name || 'Parent';
    const primaryRelation = parentData.primary_contact_relation || 'Father';
    const primaryPhone = parentData.primary_contact_phone || parentData.father_phone || '0000000000';

    const query = `
      INSERT INTO application_parent_info
      (application_id, father_name, father_occupation, father_phone, father_email,
       mother_name, mother_occupation, mother_phone, mother_email,
       guardian_name, guardian_relation, guardian_phone, guardian_email,
       primary_contact_person, primary_contact_relation, primary_contact_phone,
       address, city, state, postal_code, income_range)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (application_id) DO UPDATE
      SET father_name = $2, father_occupation = $3, father_phone = $4, father_email = $5,
          mother_name = $6, mother_occupation = $7, mother_phone = $8, mother_email = $9,
          guardian_name = $10, guardian_relation = $11, guardian_phone = $12, guardian_email = $13,
          primary_contact_person = $14, primary_contact_relation = $15, primary_contact_phone = $16,
          address = $17, city = $18, state = $19, postal_code = $20, income_range = $21,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      applicationId,
      parentData.father_name || null,
      parentData.father_occupation || null,
      parentData.father_phone || null,
      parentData.father_email || null,
      parentData.mother_name || null,
      parentData.mother_occupation || null,
      parentData.mother_phone || null,
      parentData.mother_email || null,
      parentData.guardian_name || null,
      gRelation,
      parentData.guardian_phone || null,
      parentData.guardian_email || null,
      primaryContact,
      primaryRelation,
      primaryPhone,
      parentData.address || null,
      parentData.city || null,
      parentData.state || null,
      parentData.postal_code || null,
      parentData.income_range || null
    ];

    console.log("SQL Values Parent:", JSON.stringify(values));
    await client.query(query, values);

    // Advance current_step to 3
    await client.query(
      `UPDATE application SET current_step = GREATEST(current_step, 3), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [applicationId]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Parent info saved' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ SQL Error in saveParentInfo:', error.message);
    throw new Error(`Failed to save parent info: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Save academic info (Step 3)
 * POST /api/applications/:id/academic-info
 */
export const saveAcademicInfo = async (applicationId, schoolId, academicData) => {
  const client = await pool.connect();
  try {
    if (!applicationId || Number.isNaN(Number(applicationId))) {
      throw new Error('Valid application_id is required');
    }

    if (!schoolId || Number.isNaN(Number(schoolId))) {
      throw new Error('Valid school_id is required');
    }

    if (!academicData?.desired_class || !String(academicData.desired_class).trim()) {
      throw new Error('desired_class is required');
    }

    if (
      academicData.marks_percentage !== null
      && academicData.marks_percentage !== undefined
      && academicData.marks_percentage !== ''
    ) {
      const marks = Number(academicData.marks_percentage);
      if (Number.isNaN(marks) || marks < 0 || marks > 100) {
        throw new Error('marks_percentage must be between 0 and 100');
      }
    }

    await client.query('BEGIN');

    const targetApplicationId = Number(applicationId);
    console.log(`📝 Saving Academic Info for App: ${targetApplicationId}`);

    const appCheck = await client.query(
      `SELECT id FROM application WHERE id = $1 AND school_id = $2`,
      [targetApplicationId, schoolId],
    );

    if (!appCheck.rows.length) {
      throw new Error('Invalid application_id or school_id');
    }

    const query = `
      INSERT INTO application_academic_info
      (application_id, school_id, desired_class, previous_school, previous_class,
       marks_percentage, board_name, academic_year,
       additional_qualifications, extracurricular_activities, achievements)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (application_id) DO UPDATE
      SET desired_class = EXCLUDED.desired_class,
          previous_school = EXCLUDED.previous_school,
          previous_class = EXCLUDED.previous_class,
          marks_percentage = EXCLUDED.marks_percentage,
          board_name = EXCLUDED.board_name,
          academic_year = EXCLUDED.academic_year,
          additional_qualifications = EXCLUDED.additional_qualifications,
          extracurricular_activities = EXCLUDED.extracurricular_activities,
          achievements = EXCLUDED.achievements,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      targetApplicationId,
      schoolId,
      String(academicData.desired_class).trim(),
      academicData.previous_school || null,
      academicData.previous_class || null,
      academicData.marks_percentage === '' ? null : academicData.marks_percentage,
      academicData.board_name || null,
      academicData.academic_year || null,
      academicData.additional_qualifications || null,
      academicData.extracurricular_activities || null,
      academicData.achievements || null,
    ];

    console.log("SQL Values Academic:", JSON.stringify(values));
    await client.query(query, values);

    // Advance current_step to 4
    await client.query(
      `UPDATE application SET current_step = 4, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [targetApplicationId],
    );

    await client.query('COMMIT');
    return { success: true, message: 'Academic info saved successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ SQL Error in saveAcademicInfo:', error.message);
    throw new Error(`Failed to save academic info: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Save documents (Step 5)
 * POST /api/applications/:id/documents
 */
export const saveDocuments = async (applicationId, payload = {}, uploadedFiles = []) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('applicationId:', applicationId);
    console.log('documents payload type:', typeof payload);

    const resolvedApplicationId = Number(applicationId);
    if (!Number.isInteger(resolvedApplicationId) || resolvedApplicationId <= 0) {
      throw new Error('Valid applicationId is required');
    }

    const applicationCheck = await client.query(
      'SELECT id FROM application WHERE id = $1',
      [resolvedApplicationId],
    );

    if (!applicationCheck.rows.length) {
      throw new Error('Application Not Found');
    }

    await ensureApplicationFileConstraints(client);

    const uploadedFileMap = new Map(
      (Array.isArray(uploadedFiles) ? uploadedFiles : []).map((file) => [file.fieldname, file]),
    );

    const stage = String(payload.stage || 'all').toLowerCase();
    const photosPayload = payload.photos && typeof payload.photos === 'object' ? payload.photos : {};
    const documentsPayload = payload.documents && typeof payload.documents === 'object' ? payload.documents : {};
    const documentNumbersPayload = payload.documentNumbers && typeof payload.documentNumbers === 'object'
      ? payload.documentNumbers
      : {};

    const inputDocumentTypes = Object.keys(documentsPayload);
    const invalidInputDocumentTypes = inputDocumentTypes
      .map((type) => normalizeApplicationDocumentType(type))
      .filter((typeResult) => typeResult.usedFallback)
      .map((typeResult) => String(typeResult.original));

    if (invalidInputDocumentTypes.length > 0) {
      console.warn(
        `Invalid application document_type values received for application ${resolvedApplicationId}: ${invalidInputDocumentTypes.join(', ')}`,
      );
    }

    const resolveUploadedFile = (fieldName) => {
      const file = uploadedFileMap.get(fieldName);
      if (!file) {
        return null;
      }

      return {
        file_name: file.originalname,
        file_path: toPublicFilePath(file.filename),
        file_size: file.size,
        mime_type: file.mimetype,
      };
    };

    const resolveExistingFile = (value) => {
      const normalized = normalizeFileRecord(value);
      if (!normalized) {
        return null;
      }

      return {
        file_name: normalized.file_name,
        file_path: normalized.file_path,
        file_size: normalized.file_size ?? null,
        mime_type: normalized.mime_type ?? null,
      };
    };

    const upsertApplicationPhoto = async (photoType, value) => {
      const uploaded = resolveUploadedFile(`photo_${photoType}`) || resolveUploadedFile(photoType);
      const existing = uploaded || resolveExistingFile(value);

      if (!existing?.file_path) {
        return;
      }

      await client.query(
        `INSERT INTO application_photos
         (application_id, photo_type, file_name, file_path, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (application_id, photo_type) DO UPDATE
         SET file_name = EXCLUDED.file_name,
             file_path = EXCLUDED.file_path,
             file_size = EXCLUDED.file_size,
             mime_type = EXCLUDED.mime_type,
             updated_at = CURRENT_TIMESTAMP`,
        [
          resolvedApplicationId,
          photoType,
          existing.file_name || path.basename(existing.file_path),
          existing.file_path,
          existing.file_size || null,
          existing.mime_type || null,
        ],
      );
    };

    const upsertApplicationDocument = async (documentType, value) => {
      const normalizedTypeResult = normalizeApplicationDocumentType(documentType);
      const safeDocumentType = normalizedTypeResult.normalized;

      const uploaded = resolveUploadedFile(`document_${safeDocumentType}`) || resolveUploadedFile(safeDocumentType);
      const existing = uploaded || resolveExistingFile(value);

      const documentNumber = String(
        value?.document_number
        ?? value?.documentNumber
        ?? documentNumbersPayload[safeDocumentType]
        ?? '',
      ).trim() || null;

      if (!existing?.file_path && !documentNumber) {
        return;
      }

      const existingRowResult = await client.query(
        `SELECT file_name, file_path, file_size, mime_type, document_number
         FROM application_documents
         WHERE application_id = $1 AND document_type = $2
         LIMIT 1`,
        [resolvedApplicationId, safeDocumentType],
      );
      const existingRow = existingRowResult.rows[0] || null;

      const nextFileName = existing?.file_name || existingRow?.file_name || null;
      const nextFilePath = existing?.file_path || existingRow?.file_path || null;
      const nextFileSize = existing ? (existing.file_size ?? null) : (existingRow?.file_size ?? null);
      const nextMimeType = existing ? (existing.mime_type ?? null) : (existingRow?.mime_type ?? null);
      const nextDocumentNumber = documentNumber || existingRow?.document_number || null;

      await client.query(
        `INSERT INTO application_documents
         (application_id, document_type, file_name, file_path, file_size, mime_type, document_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (application_id, document_type) DO UPDATE
         SET file_name = EXCLUDED.file_name,
             file_path = EXCLUDED.file_path,
             file_size = EXCLUDED.file_size,
             mime_type = EXCLUDED.mime_type,
             document_number = EXCLUDED.document_number,
             updated_at = CURRENT_TIMESTAMP`,
        [
          resolvedApplicationId,
          safeDocumentType,
          nextFileName || (nextFilePath ? path.basename(nextFilePath) : null),
          nextFilePath,
          nextFileSize,
          nextMimeType,
          nextDocumentNumber,
        ],
      );
    };

    if (stage === 'photos' || stage === 'all') {
      for (const photoType of APPLICATION_PHOTO_TYPES) {
        await upsertApplicationPhoto(photoType, photosPayload[photoType]);
      }

      await client.query(
        `UPDATE application
         SET current_step = GREATEST(current_step, 5),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [resolvedApplicationId],
      );
    }

    if (stage === 'documents' || stage === 'all') {
      const documentTypesToSave = Array.from(new Set([
        ...Object.keys(documentsPayload),
        ...Object.keys(documentNumbersPayload),
      ]));

      const missingDocumentNumbers = documentTypesToSave.filter((documentType) => {
        const normalizedTypeResult = normalizeApplicationDocumentType(documentType);
        const safeDocumentType = normalizedTypeResult.normalized;
        const numberValue = String(
          documentsPayload?.[safeDocumentType]?.document_number
          ?? documentsPayload?.[safeDocumentType]?.documentNumber
          ?? documentNumbersPayload?.[safeDocumentType]
          ?? '',
        ).trim();
        return !numberValue;
      });

      if (missingDocumentNumbers.length > 0) {
        throw new Error(`document_number is required for: ${missingDocumentNumbers.join(', ')}`);
      }

      for (const [documentType, value] of Object.entries(documentsPayload)) {
        await upsertApplicationDocument(documentType, value);
      }

      // Preserve compatibility for clients sending files in multipart field names only.
      for (const documentType of APPLICATION_DOCUMENT_TYPES) {
        if (!(documentType in documentsPayload)) {
          await upsertApplicationDocument(documentType, null);
        }
      }

      await client.query(
        `UPDATE application
         SET current_step = GREATEST(current_step, 6),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [resolvedApplicationId],
      );
    }

    await client.query('COMMIT');
    return { success: true, message: 'Application files saved' };
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Delete uploaded files if transaction failed (ensure file atomicity)
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        try {
          if (file.filename || file.path) {
            const filePath = file.path || file.filename;
            await unlink(filePath);
            console.log(`✅ Deleted file: ${filePath}`);
          }
        } catch (unlinkError) {
          console.error(`❌ Failed to delete file ${file.filename || file.path}: ${unlinkError.message}`);
        }
      }
    }
    
    throw new Error(`Failed to save documents: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Submit application (Step 6)
 * POST /api/applications/:id/submit
 */
export const submitApplication = async (applicationId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update application status to submitted
    await client.query(
      `UPDATE application SET status = 'submitted', current_step = 6, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [applicationId]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Application submitted' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to submit application: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Get application details for prefill
 */
export const getApplicationDetails = async (applicationId, schoolId) => {
  try {
    const appQuery = `
      SELECT
        a.*,
        ay.year_name AS academic_year_name,
        l.first_name AS lead_first_name,
        l.last_name AS lead_last_name,
        l.email AS lead_email,
        l.phone AS lead_phone,
        l.desired_class AS lead_desired_class
      FROM application a
      LEFT JOIN academic_year ay ON ay.id = a.academic_year_id
      LEFT JOIN lead l ON a.lead_id = l.id
      WHERE a.id = $1
      ${schoolId ? 'AND a.school_id = $2' : ''}
      LIMIT 1
    `;
    const app = await pool.query(appQuery, schoolId ? [applicationId, schoolId] : [applicationId]);

    if (!app.rows.length) {
      throw new Error('Application not found');
    }

    const studentQuery = `SELECT * FROM application_student_info WHERE application_id = $1 LIMIT 1`;
    const parentQuery = `SELECT * FROM application_parent_info WHERE application_id = $1 LIMIT 1`;
    const academicQuery = `SELECT * FROM application_academic_info WHERE application_id = $1 LIMIT 1`;
    const photosQuery = `
      SELECT *
      FROM application_photos
      WHERE application_id = $1
      ORDER BY created_at DESC, id DESC
    `;
    const documentsQuery = `
      SELECT *
      FROM application_documents
      WHERE application_id = $1
      ORDER BY created_at DESC, id DESC
    `;

    const lookupParams = [applicationId];

    const [student, parent, academic, photos, documents] = await Promise.all([
      pool.query(studentQuery, lookupParams),
      pool.query(parentQuery, lookupParams),
      pool.query(academicQuery, lookupParams),
      pool.query(photosQuery, lookupParams),
      pool.query(documentsQuery, lookupParams),
    ]);

    const photoMap = photos.rows.reduce((accumulator, row) => {
      accumulator[row.photo_type] = normalizeFileRecord(row);
      return accumulator;
    }, {});

    const documentMap = documents.rows.reduce((accumulator, row) => {
      accumulator[row.document_type] = normalizeFileRecord(row);
      return accumulator;
    }, {});

    return {
      application: app.rows[0],
      student_info: student.rows[0] || {},
      parent_info: parent.rows[0] || {},
      academic_info: academic.rows[0] || {},
      photos: photoMap,
      documents: documentMap,
    };
  } catch (error) {
    throw new Error(`Failed to get application details: ${error.message}`);
  }
};

const STEP_ORDER = ['student', 'parent', 'academic', 'documents', 'review'];

const ensureAdmissionResumeColumns = async (db) => {
  await db.query(
    `ALTER TABLE admission
     ADD COLUMN IF NOT EXISTS current_step VARCHAR(30) DEFAULT 'student'`,
  );

  await db.query(
    `ALTER TABLE admission
     ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false`,
  );

  await db.query(
    `ALTER TABLE student
     ADD COLUMN IF NOT EXISTS admission_id BIGINT`,
  );

  await db.query(
    `ALTER TABLE parent_detail
     ADD COLUMN IF NOT EXISTS admission_id BIGINT`,
  );

  await db.query(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY admission_id
               ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
             ) AS rn
      FROM parent_detail
      WHERE admission_id IS NOT NULL
    )
    DELETE FROM parent_detail p
    USING ranked r
    WHERE p.id = r.id
      AND r.rn > 1
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_parent_detail_admission_id'
          AND conrelid = 'parent_detail'::regclass
      ) THEN
        ALTER TABLE parent_detail
        ADD CONSTRAINT unique_parent_detail_admission_id UNIQUE (admission_id);
      END IF;
    END $$;
  `);

  await db.query(
    `CREATE TABLE IF NOT EXISTS student_photos (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
      admission_id BIGINT NOT NULL UNIQUE REFERENCES admission(id) ON DELETE CASCADE,
      student_photo TEXT,
      passport_photos TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS student_documents (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
      admission_id BIGINT NOT NULL UNIQUE REFERENCES admission(id) ON DELETE CASCADE,
      birth_certificate TEXT,
      aadhaar_card TEXT,
      passport_photos TEXT,
      transfer_certificate TEXT,
      previous_report_card TEXT,
      address_proof TEXT,
      parent_id_proof TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  );
};

const getDefaultClassAndSection = async (client, schoolId) => {
  const classResult = await client.query(
    `SELECT id FROM school_class WHERE school_id = $1 ORDER BY class_numeric_value ASC LIMIT 1`,
    [schoolId],
  );

  if (!classResult.rows.length) {
    throw new Error('No classes configured for this school');
  }

  const classId = classResult.rows[0].id;

  const sectionResult = await client.query(
    `SELECT id FROM section WHERE class_id = $1 ORDER BY section_name ASC LIMIT 1`,
    [classId],
  );

  if (!sectionResult.rows.length) {
    throw new Error('No sections configured for default class');
  }

  return { classId, sectionId: sectionResult.rows[0].id };
};

export const startAdmissionApplication = async (schoolId, payload = {}) => {
  const { lead_id, academic_year_id } = payload;
  const client = await pool.connect();

  try {
    if (!schoolId || !lead_id || !academic_year_id) {
      throw new Error('school_id, lead_id and academic_year_id are required');
    }

    await client.query('BEGIN');
    await ensureAdmissionResumeColumns(client);

    const existing = await client.query(
      `SELECT id, current_step, status
       FROM admission
       WHERE school_id = $1 AND lead_id = $2 AND is_completed = false
       ORDER BY id DESC
       LIMIT 1`,
      [schoolId, lead_id],
    );

    if (existing.rows.length) {
      await client.query('COMMIT');
      return {
        admission_id: existing.rows[0].id,
        current_step: existing.rows[0].current_step || 'student',
        status: existing.rows[0].status || 'draft',
        resumed: true,
      };
    }

    const leadResult = await client.query(
      `SELECT first_name, last_name, phone, email
       FROM lead
       WHERE id = $1 AND school_id = $2`,
      [lead_id, schoolId],
    );

    if (!leadResult.rows.length) {
      throw new Error('Lead not found for this school');
    }

    const { classId, sectionId } = await getDefaultClassAndSection(client, schoolId);
    const lead = leadResult.rows[0];
    const admissionNumber = `ADM-DRAFT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const studentInsert = await client.query(
      `INSERT INTO student
       (school_id, admission_number, first_name, last_name, phone, email, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', 'system')
       RETURNING id`,
      [
        schoolId,
        admissionNumber,
        lead.first_name || 'Draft',
        lead.last_name || 'Student',
        lead.phone || null,
        lead.email || null,
      ],
    );

    const studentId = studentInsert.rows[0].id;

    const admissionInsert = await client.query(
      `INSERT INTO admission
       (school_id, student_id, lead_id, academic_year_id, class_id, section_id, admission_date, status, admission_type, current_step, is_completed, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'draft', 'new', 'student', false, 'system')
       RETURNING id, current_step, status`,
      [schoolId, studentId, lead_id, academic_year_id, classId, sectionId],
    );

    const admissionId = admissionInsert.rows[0].id;

    await client.query(
      `UPDATE student SET admission_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [admissionId, studentId],
    );

    await client.query('COMMIT');

    return {
      admission_id: admissionId,
      current_step: admissionInsert.rows[0].current_step,
      status: admissionInsert.rows[0].status,
      resumed: false,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to start admission application: ${error.message}`);
  } finally {
    client.release();
  }
};

export const saveAdmissionStep = async (schoolId, payload = {}) => {
  const rawAdmissionId = payload.admission_id ?? payload.application_id;
  const admissionId = Number(rawAdmissionId);
  const { step, data = {} } = payload;
  const client = await pool.connect();

  try {
    if (!schoolId) {
      throw new Error('Valid school_id is required');
    }

    if (!Number.isInteger(admissionId) || admissionId <= 0) {
      throw new Error('Valid admission_id is required');
    }

    if (!step || !STEP_ORDER.includes(step)) {
      throw new Error('Valid step is required');
    }

    await client.query('BEGIN');
    await ensureAdmissionResumeColumns(client);

    const admissionResult = await client.query(
      `SELECT id, student_id, application_id FROM admission WHERE id = $1 AND school_id = $2`,
      [admissionId, schoolId],
    );

    if (!admissionResult.rows.length) {
      throw new Error('Admission not found');
    }

    const studentId = admissionResult.rows[0].student_id;
    const linkedApplicationId = admissionResult.rows[0].application_id;

    if (step === 'student') {
      await client.query(
        `UPDATE student
         SET admission_id = $3,
             first_name = COALESCE($4, first_name),
             last_name = COALESCE($5, last_name),
             date_of_birth = COALESCE($6, date_of_birth),
             gender = COALESCE($7, gender),
             phone = COALESCE($8, phone),
             email = COALESCE($9, email),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND school_id = $2`,
        [
          studentId,
          schoolId,
          admissionId,
          data.first_name || null,
          data.last_name || null,
          data.date_of_birth || data.dob || null,
          data.gender || null,
          data.phone || data.student_phone || null,
          data.email || data.student_email || null,
        ],
      );
    }

    if (step === 'parent') {
      await client.query(
        `INSERT INTO parent_detail
         (school_id, student_id, admission_id, relation, first_name, last_name, phone, email, occupation, address, city, income_range)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (admission_id) DO UPDATE
         SET relation = EXCLUDED.relation,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             occupation = EXCLUDED.occupation,
             address = EXCLUDED.address,
             city = EXCLUDED.city,
             income_range = EXCLUDED.income_range,
             updated_at = CURRENT_TIMESTAMP`,
        [
          schoolId,
          studentId,
          admissionId,
          data.primary_contact_relation || 'Father',
          data.father_name || data.fatherName || data.primary_contact_person || 'Parent',
          null,
          data.primary_contact_phone || data.father_phone || data.fatherPhone || null,
          data.father_email || data.fatherEmail || null,
          data.father_occupation || data.fatherOccupation || null,
          data.address || null,
          data.city || null,
          data.income_range || data.incomeRange || null,
        ],
      );
    }

    if (step === 'academic') {
      const targetApplicationId = Number(data.application_id || linkedApplicationId);

      if (!targetApplicationId || Number.isNaN(targetApplicationId)) {
        throw new Error('application_id is required for academic step');
      }

      await client.query(
        `INSERT INTO application_academic_info
         (application_id, school_id, desired_class, previous_school, previous_class,
          marks_percentage, board_name, academic_year,
          additional_qualifications, extracurricular_activities, achievements)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (application_id) DO UPDATE
         SET desired_class = EXCLUDED.desired_class,
             previous_school = EXCLUDED.previous_school,
             previous_class = EXCLUDED.previous_class,
             marks_percentage = EXCLUDED.marks_percentage,
             board_name = EXCLUDED.board_name,
             academic_year = EXCLUDED.academic_year,
             additional_qualifications = EXCLUDED.additional_qualifications,
             extracurricular_activities = EXCLUDED.extracurricular_activities,
             achievements = EXCLUDED.achievements,
             updated_at = CURRENT_TIMESTAMP`,
        [
          targetApplicationId,
          schoolId,
          data.desired_class,
          data.previous_school || null,
          data.previous_class || null,
          data.marks_percentage ?? null,
          data.board_name || null,
          data.academic_year || null,
          data.additional_qualifications || null,
          data.extracurricular_activities || null,
          data.achievements || null,
        ],
      );

      await client.query(
        `UPDATE application
         SET current_step = 4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND school_id = $2`,
        [targetApplicationId, schoolId],
      );
    }

    if (step === 'documents') {
      const photos = data.photos || {};
      const docs = data.documents || {};

      await client.query(
        `INSERT INTO student_photos
         (school_id, admission_id, student_photo, passport_photos)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (admission_id) DO UPDATE
         SET student_photo = COALESCE(EXCLUDED.student_photo, student_photos.student_photo),
             passport_photos = COALESCE(EXCLUDED.passport_photos, student_photos.passport_photos),
             updated_at = CURRENT_TIMESTAMP`,
        [
          schoolId,
          admissionId,
          photos.student_photo || photos.studentPhoto || null,
          photos.passport_photos || photos.passportPhotos || null,
        ],
      );

      await client.query(
        `INSERT INTO student_documents
         (school_id, admission_id, birth_certificate, aadhaar_card, passport_photos, transfer_certificate, previous_report_card, address_proof, parent_id_proof)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (admission_id) DO UPDATE
         SET birth_certificate = COALESCE(EXCLUDED.birth_certificate, student_documents.birth_certificate),
             aadhaar_card = COALESCE(EXCLUDED.aadhaar_card, student_documents.aadhaar_card),
             passport_photos = COALESCE(EXCLUDED.passport_photos, student_documents.passport_photos),
             transfer_certificate = COALESCE(EXCLUDED.transfer_certificate, student_documents.transfer_certificate),
             previous_report_card = COALESCE(EXCLUDED.previous_report_card, student_documents.previous_report_card),
             address_proof = COALESCE(EXCLUDED.address_proof, student_documents.address_proof),
             parent_id_proof = COALESCE(EXCLUDED.parent_id_proof, student_documents.parent_id_proof),
             updated_at = CURRENT_TIMESTAMP`,
        [
          schoolId,
          admissionId,
          docs.birth_certificate || null,
          docs.aadhaar_card || docs.aadhaarCard || null,
          docs.passport_photos || docs.passportPhotos || null,
          docs.transfer_certificate || null,
          docs.previous_report_card || docs.previousReportCard || null,
          docs.address_proof || null,
          docs.parent_id_proof || docs.parentIdProof || null,
        ],
      );
    }

    // Advance current_step to the NEXT step so progress shows the right step on resume
    const currentIndex = STEP_ORDER.indexOf(step);
    const nextStep = currentIndex >= 0 && currentIndex < STEP_ORDER.length - 1
      ? STEP_ORDER[currentIndex + 1]
      : step; // stay on last step (review)

    await client.query(
      `UPDATE admission
       SET current_step = $1,
           status = 'draft',
           is_completed = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND school_id = $3`,
      [nextStep, admissionId, schoolId],
    );

    await client.query('COMMIT');

    return {
      admission_id: admissionId,
      current_step: nextStep,
      status: 'draft',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to save step: ${error.message}`);
  } finally {
    client.release();
  }
};

export const getAdmissionApplicationById = async (schoolId, admissionId) => {
  await ensureAdmissionResumeColumns(pool);

  const result = await pool.query(
    `SELECT id, school_id, lead_id, application_id, student_id, academic_year_id, class_id, section_id, status, current_step, is_completed, created_at, updated_at
     FROM admission
     WHERE id = $1 AND school_id = $2`,
    [admissionId, schoolId],
  );

  if (!result.rows.length) {
    throw new Error('Admission not found');
  }

  const applicationId = result.rows[0].application_id;
  const [studentRes, parentRes, academicRes, photosRes, docsRes] = await Promise.all([
    pool.query(`SELECT * FROM student WHERE admission_id = $1 LIMIT 1`, [admissionId]),
    pool.query(`SELECT * FROM parent_detail WHERE admission_id = $1 LIMIT 1`, [admissionId]),
    applicationId
      ? pool.query(`SELECT * FROM application_academic_info WHERE application_id = $1 LIMIT 1`, [applicationId])
      : Promise.resolve({ rows: [] }),
    pool.query(`SELECT * FROM student_photos WHERE admission_id = $1 LIMIT 1`, [admissionId]),
    pool.query(`SELECT * FROM student_documents WHERE admission_id = $1 LIMIT 1`, [admissionId]),
  ]);

  return {
    admission: result.rows[0],
    student: studentRes.rows[0] || null,
    parent: parentRes.rows[0] || null,
    academic: academicRes.rows[0] || null,
    photos: photosRes.rows[0] || null,
    documents: docsRes.rows[0] || null,
    current_step: result.rows[0].current_step || 'student',
  };
};

export const completeAdmissionApplication = async (schoolId, admissionId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureAdmissionResumeColumns(client);

    const docsRes = await client.query(
      `SELECT * FROM student_documents WHERE admission_id = $1 LIMIT 1`,
      [admissionId],
    );

    const photosRes = await client.query(
      `SELECT * FROM student_photos WHERE admission_id = $1 LIMIT 1`,
      [admissionId],
    );

    const docs = docsRes.rows[0] || {};
    const photos = photosRes.rows[0] || {};

    const mandatoryDocuments = [
      'birth_certificate',
      'aadhaar_card',
      'passport_photos',
      'transfer_certificate',
      'previous_report_card',
      'address_proof',
      'parent_id_proof',
    ];

    const missingDocs = mandatoryDocuments.filter((key) => !docs[key]);

    if (!photos.student_photo) {
      throw new Error('Student photo is mandatory before confirmation');
    }

    if (missingDocs.length) {
      throw new Error(`Missing required documents: ${missingDocs.join(', ')}`);
    }

    const update = await client.query(
      `UPDATE admission
       SET status = 'submitted',
           is_completed = true,
           current_step = 'review',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND school_id = $2
       RETURNING id, status, is_completed, current_step`,
      [admissionId, schoolId],
    );

    if (!update.rows.length) {
      throw new Error('Admission not found');
    }

    await client.query('COMMIT');
    return update.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to complete admission application: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Delete a draft application
 * Only allows deletion if status is 'draft'
 */
export const deleteApplication = async (schoolId, applicationId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch the application to verify status and ownership
    const appQuery = `
      SELECT id, school_id, status
      FROM application
      WHERE id = $1 AND school_id = $2
    `;

    const appResult = await client.query(appQuery, [applicationId, schoolId]);

    if (!appResult.rows.length) {
      throw new Error('Application not found');
    }

    const application = appResult.rows[0];

    // Verify that the application is still a draft/in-progress record
    if (!['draft', 'in_progress'].includes(application.status)) {
      throw new Error(`Cannot delete application with status '${application.status}'. Only draft applications can be deleted.`);
    }

    // Delete associated documents (will cascade delete via FK constraints)
    await client.query(
      'DELETE FROM application_documents WHERE application_id = $1',
      [applicationId]
    );

    // Delete associated photos (will cascade delete via FK constraints)
    await client.query(
      'DELETE FROM application_photos WHERE application_id = $1',
      [applicationId]
    );

    // Delete the application itself
    const deleteQuery = `
      DELETE FROM application
      WHERE id = $1 AND school_id = $2 AND status = ('in_progress')
      RETURNING id, school_id, status
    `;

    const deleteResult = await client.query(deleteQuery, [applicationId, schoolId]);

    if (!deleteResult.rows.length) {
      throw new Error('Failed to delete application');
    }

    await client.query('COMMIT');

    return {
      id: deleteResult.rows[0].id,
      message: 'Application deleted successfully'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
