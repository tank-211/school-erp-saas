const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

const verifyInternalStaff = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.SP_JWT_SECRET);

    // Verify the user still exists and is active in service_provider_staff
    const result = await pool.query(
      'SELECT id, full_name, email, internal_role, is_active FROM service_provider_staff WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token. Staff not found.' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ error: 'Account deactivated.' });
    }

    req.staffUser = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = verifyInternalStaff;
