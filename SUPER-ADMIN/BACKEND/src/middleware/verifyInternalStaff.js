const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

const verifyInternalStaff = async (req, res, next) => {
  console.log(">>> verifyInternalStaff called");

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No Authorization header");
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.SP_JWT_SECRET);
    console.log("JWT verified:", decoded);

    console.log("Finding staff...");
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

    console.log("Staff:", staff);

    if (!staff) {
      console.log("Staff not found");
      return res.status(401).json({ error: "Invalid token. Staff not found." });
    }

    if (!staff.is_active) {
      console.log("Staff inactive");
      return res.status(403).json({ error: "Account deactivated." });
    }

    console.log("Calling next()");
    req.staffUser = staff;
    next();

  } catch (err) {
    console.error("=== verifyInternalStaff ERROR ===");
    console.error(err);
    console.error(err.stack);

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }

    return res.status(500).json({ error: err.message });
  }
};

module.exports = verifyInternalStaff;