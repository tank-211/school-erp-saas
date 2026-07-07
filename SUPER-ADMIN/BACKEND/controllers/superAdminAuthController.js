const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT id, full_name, email, password_hash, internal_role, is_active FROM service_provider_staff WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const staff = result.rows[0];

    if (!staff.is_active) {
      return res.status(403).json({ error: 'Account deactivated.' });
    } 

    const isValidPassword = await bcrypt.compare(password, staff.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: staff.id, email: staff.email, internal_role: staff.internal_role },
      process.env.SP_JWT_SECRET,
      { expiresIn: process.env.SP_JWT_EXPIRY || '8h' }
    );

    // Update last_login
    await pool.query(
      'UPDATE service_provider_staff SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [staff.id]
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: staff.id,
        full_name: staff.full_name,
        email: staff.email,
        internal_role: staff.internal_role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { login };
