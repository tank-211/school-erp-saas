const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// GET /api/super-admin/staff — List internal staff users
const getAllStaff = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, internal_role, is_active, created_at, last_login
       FROM service_provider_staff
       ORDER BY created_at DESC`
    );

    return res.json({ staff: result.rows });
  } catch (err) {
    console.error('Get staff error:', err);
    return res.status(500).json({ error: 'Failed to fetch staff members.' });
  }
};

// POST /api/super-admin/staff — Create internal staff user
const createStaff = async (req, res) => {
  try {
    const { full_name, email, password, internal_role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const role = internal_role || 'support';
    const allowedRoles = ['super_admin', 'support', 'billing'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role value.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO service_provider_staff (full_name, email, password_hash, internal_role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, full_name, email, internal_role, is_active, created_at`,
      [full_name, email, password_hash, role]
    );

    return res.status(201).json({
      message: 'Staff member created successfully.',
      staff: result.rows[0],
    });
  } catch (err) {
    console.error('Create staff error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Staff email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create staff member.' });
  }
};

module.exports = { getAllStaff, createStaff };
