const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const allowedPlanTypes = new Set(['trial', 'basic', 'pro', 'ultimate']);

const normalizePlanType = (planType) => {
  if (planType === undefined || planType === null || planType === '') {
    return 'trial';
  }

  return String(planType).trim().toLowerCase();
};

const getTableColumns = async (tableName) => {
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = $1`,
    [tableName]
  );

  return new Set(result.rows.map((row) => row.column_name));
};

const tableExists = async (tableName) => {
  const result = await pool.query('SELECT to_regclass($1) IS NOT NULL AS exists', [tableName]);
  return result.rows[0].exists;
};

// GET /api/super-admin/schools — Fetch all schools
const getAllSchools = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, address, city, state, postal_code, country,
              principal_name, status, plan_type, is_active, expiry_date,
              created_at, updated_at,
              (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE) AS is_expired,
              (expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS is_expiring_soon
       FROM school ORDER BY created_at DESC`
    );
    return res.json({ schools: result.rows });
  } catch (err) {
    console.error('Get schools error:', err);
    return res.status(500).json({ error: 'Failed to fetch schools.' });
  }
};

// GET /api/super-admin/stats — Dashboard summary metrics
const getStats = async (req, res) => {
  try {
    const [schoolColumns, studentExists, appUserExists] = await Promise.all([
      getTableColumns('school'),
      tableExists('student'),
      tableExists('app_user'),
    ]);

    const [studentColumns, appUserColumns] = await Promise.all([
      studentExists ? getTableColumns('student') : Promise.resolve(new Set()),
      appUserExists ? getTableColumns('app_user') : Promise.resolve(new Set()),
    ]);

    const hasSchoolStatus = schoolColumns.has('status');
    const hasSchoolIsActive = schoolColumns.has('is_active');
    const hasSchoolExpiryDate = schoolColumns.has('expiry_date');
    const hasSchoolPlanType = schoolColumns.has('plan_type');

    const activeSchoolCondition = hasSchoolIsActive
      ? 'is_active = TRUE'
      : hasSchoolStatus
        ? "status = 'active'"
        : 'TRUE';
    const suspendedSchoolCondition = hasSchoolStatus ? "status = 'suspended'" : 'FALSE';
    const expiredSchoolCondition = hasSchoolExpiryDate
      ? 'expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE'
      : 'FALSE';
    const expiringSoonCondition = hasSchoolExpiryDate
      ? "expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'"
      : 'FALSE';

    const studentCountQuery = studentExists
      ? `SELECT COUNT(*)::int AS total_active_students
         FROM student
         ${studentColumns.has('status') ? "WHERE status = 'active'" : ''}`
      : 'SELECT 0::int AS total_active_students';

    const expiringSoonQuery = hasSchoolExpiryDate
      ? `SELECT id,
                name,
                ${hasSchoolPlanType ? 'plan_type' : "'trial' AS plan_type"},
                ${hasSchoolIsActive ? 'is_active' : `${activeSchoolCondition} AS is_active`},
                expiry_date
         FROM school
         WHERE ${expiringSoonCondition}
         ORDER BY expiry_date ASC`
      : `SELECT NULL::bigint AS id,
                NULL::varchar AS name,
                NULL::varchar AS plan_type,
                NULL::boolean AS is_active,
                NULL::date AS expiry_date
         WHERE FALSE`;

    const schoolUserCountsQuery = appUserExists && appUserColumns.has('school_id')
      ? `SELECT school_id, COUNT(*)::int AS total_users
         FROM app_user
         GROUP BY school_id
         ORDER BY school_id`
      : `SELECT NULL::bigint AS school_id, 0::int AS total_users
         WHERE FALSE`;

    const [schoolStats, activeStudents, expiringSoon, schoolUserCounts] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total_schools,
           COUNT(*) FILTER (WHERE ${activeSchoolCondition})::int AS active_schools,
           COUNT(*) FILTER (WHERE ${suspendedSchoolCondition})::int AS suspended_schools,
           COUNT(*) FILTER (WHERE ${expiredSchoolCondition})::int AS expired_schools,
           COUNT(*) FILTER (WHERE ${expiringSoonCondition})::int AS expiring_soon_schools
         FROM school`
      ),
      pool.query(studentCountQuery),
      pool.query(expiringSoonQuery),
      pool.query(schoolUserCountsQuery),
    ]);

    return res.json({
      stats: {
        ...schoolStats.rows[0],
        total_active_students: activeStudents.rows[0].total_active_students,
      },
      expiring_schools: expiringSoon.rows,
      school_user_counts: schoolUserCounts.rows,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
};

// POST /api/super-admin/schools — Create school + provision first admin
const createSchool = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      name, email, phone, address, city, state, postal_code, country,
      principal_name, plan_type, expiry_date,
      admin_name, admin_email, admin_password
    } = req.body;

    const normalizedPlanType = normalizePlanType(plan_type);

    if (!allowedPlanTypes.has(normalizedPlanType)) {
      return res.status(400).json({ error: 'Invalid plan type.' });
    }

    // Validate required fields
    if (!name || !admin_name || !admin_email || !admin_password) {
      return res.status(400).json({
        error: 'School name, admin name, admin email, and admin password are required.'
      });
    }

    // Insert school
    const schoolResult = await client.query(
      `INSERT INTO school (name, email, phone, address, city, state, postal_code,
        country, principal_name, plan_type, is_active, expiry_date, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,'active',$12)
       RETURNING id, name, plan_type, expiry_date`,
      [name, email, phone, address, city, state, postal_code,
       country, principal_name, normalizedPlanType, expiry_date,
       req.staffUser.full_name]
    );

    const school = schoolResult.rows[0];

    // Hash admin password and provision first admin in app_user
    const hashedPassword = await bcrypt.hash(admin_password, 10);

    const adminResult = await client.query(
      `INSERT INTO app_user (school_id, name, email, password_hash, role, status, created_by)
       VALUES ($1, $2, $3, $4, 'admin', 'active', $5)
       RETURNING id, name, email, role`,
      [school.id, admin_name, admin_email, hashedPassword, req.staffUser.full_name]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'School created and admin provisioned successfully.',
      school,
      admin: adminResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create school error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'School name or admin email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create school.' });
  } finally {
    client.release();
  }
};

// PATCH /api/super-admin/schools/:id — Update school status/expiry
const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, expiry_date, plan_type, status } = req.body;

    const normalizedPlanType = plan_type === undefined ? undefined : normalizePlanType(plan_type);
    if (normalizedPlanType !== undefined && !allowedPlanTypes.has(normalizedPlanType)) {
      return res.status(400).json({ error: 'Invalid plan type.' });
    }

    let nextStatus = status;
    let nextIsActive = is_active;

    if (nextStatus === 'active') {
      nextIsActive = true;
    } else if (nextStatus === 'suspended' || nextStatus === 'inactive') {
      nextIsActive = false;
      nextStatus = 'suspended';
    }

    if (nextIsActive !== undefined) {
      nextStatus = nextIsActive ? 'active' : (nextStatus || 'suspended');
      if (!nextIsActive) {
        nextStatus = 'suspended';
      }
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (nextIsActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(nextIsActive);
    }
    if (expiry_date !== undefined) {
      fields.push(`expiry_date = $${paramIndex++}`);
      values.push(expiry_date);
    }
    if (normalizedPlanType !== undefined) {
      fields.push(`plan_type = $${paramIndex++}`);
      values.push(normalizedPlanType);
    }
    if (nextStatus !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(nextStatus);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    fields.push(`updated_by = $${paramIndex++}`);
    values.push(req.staffUser.full_name);
    values.push(id);

    const result = await pool.query(
      `UPDATE school SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, is_active, expiry_date, plan_type, status`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }

    return res.json({
      message: 'School updated successfully.',
      school: result.rows[0],
    });
  } catch (err) {
    console.error('Update school error:', err);
    return res.status(500).json({ error: 'Failed to update school.' });
  }
};

module.exports = { getAllSchools, getStats, createSchool, updateSchool };
