import pool from '../config/db.js';

/**
 * Repository: lead
 * Handles DB CRUD for lead records.
 */

const insertLead = async ({
  school_id,
  academic_year_id,
  first_name,
  last_name,
  email,
  phone,
  desired_class,
  source,
  assigned_to,
  notes,
  created_by = 'admin',
}) => {
  const query = `
    INSERT INTO lead (
      school_id,
      academic_year_id,
      first_name,
      last_name,
      email,
      phone,
      desired_class,
      source,
      assigned_to,
      notes,
      created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id, first_name, last_name, phone, source, assigned_to, created_at
  `;

  const values = [
    school_id,
    academic_year_id,
    first_name,
    last_name,
    email,
    phone,
    desired_class,
    source,
    assigned_to,
    notes,
    created_by,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export default {
  insertLead,
};
