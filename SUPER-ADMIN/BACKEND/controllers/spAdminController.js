const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const signup = async (req, res) => {
  try { 
    const { full_name, email, password, internal_role } = req.body;
    const role = internal_role || 'staff';

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required.' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(full_name).trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'full_name is required.' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existingStaff = await pool.query(
      'SELECT id FROM service_provider_staff WHERE email = $1',
      [trimmedEmail]
    );

    if (existingStaff.rows.length > 0) {
      return res.status(409).json({ error: 'An employee with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const result = await pool.query(
      `INSERT INTO service_provider_staff (full_name, email, password_hash, internal_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, internal_role, created_at`,
      [trimmedName, trimmedEmail, passwordHash, role]
    );

    return res.status(201).json({
      message: 'Internal employee registered successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('SP signup error:', err);
    return res.status(500).json({ error: 'Failed to register internal employee.' });
  }
};

module.exports = { signup };