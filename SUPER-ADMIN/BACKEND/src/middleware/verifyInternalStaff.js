const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

const verifyInternalStaff = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.SP_JWT_SECRET);

    const staff = await prisma.service_provider_staff.findUnique({
      where: {
        id: Number(decoded.id),
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        internal_role: true,
        is_active: true,
      },
    });

    if (!staff) {
      return res.status(401).json({ error: "Invalid token. Staff not found." });
    }

    if (!staff.is_active) {
      return res.status(403).json({ error: "Account deactivated." });
    }

    req.staffUser = staff;
    next();

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }

    console.error('verifyInternalStaff error:', err);
    return res.status(500).json({ error: 'Could not verify your session. Please try again.' });
  }
};

module.exports = verifyInternalStaff;