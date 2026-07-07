const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const schoolLogin = async (req, res) => {
  try {
    const { school_id, email, password } = req.body;

    if (!school_id || !email || !password) {
      return res.status(400).json({ error: 'school_id, email and password are required.' });
    }

    const result = await pool.query(
      `SELECT id, school_id, name, email, password_hash, role, status
       FROM app_user
       WHERE school_id = $1 AND email = $2`,
      [school_id, email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account is not active.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);$2b$10$ILKvR4yPMD0Do7YCvQbcoO3sfhiVWCqHgwjamdoJPOVVTpUcr22yi
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        school_id: user.school_id,
        email: user.email,
        role: user.role,
      },
      process.env.SCHOOL_JWT_SECRET || process.env.SP_JWT_SECRET,
      { expiresIn: process.env.SCHOOL_JWT_EXPIRY || '8h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        school_id: user.school_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      school: req.schoolContext,
    });
  } catch (err) {
    console.error('School login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { schoolLogin };
