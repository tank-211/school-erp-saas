const pool = require('../../config/db');

const verifySchoolSubscription = async (req, res, next) => {
  try {
    const { school_id } = req.body;

    if (!school_id) {
      return res.status(400).json({
        error: 'school_id is required.',
        code: 'SCHOOL_ID_REQUIRED',
      });
    }

    const result = await pool.query(
      `SELECT id, name, is_active, expiry_date
       FROM school
       WHERE id = $1`,
      [school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'School not found.',
        code: 'SCHOOL_NOT_FOUND',
      });
    }

    const school = result.rows[0];

    if (!school.is_active) {
      return res.status(403).json({
        error: 'School access is inactive. Contact support.',
        code: 'SCHOOL_INACTIVE',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = school.expiry_date ? new Date(school.expiry_date) : null;

    if (expiryDate && expiryDate < today) {
      return res.status(403).json({
        error: 'Subscription expired. Please renew to continue access.',
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    req.schoolContext = school;
    return next();
  } catch (err) {
    console.error('Subscription middleware error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = verifySchoolSubscription;
