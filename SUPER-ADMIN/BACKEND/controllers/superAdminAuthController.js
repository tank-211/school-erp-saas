const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const login = async (req, res) => {
  try {
    // Tolerate stray spaces and capital letters (autofill, phone keyboards)
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: "Enter your email and password." });
    }

    const staff = await prisma.service_provider_staff.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        full_name: true,
        email: true,
        password_hash: true,
        internal_role: true,
        is_active: true,
      },
    });

    if (!staff) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isValidPassword = await bcrypt.compare(password, staff.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Deactivated staff cannot sign in (checked after the password)
    if (!staff.is_active) {
      return res.status(403).json({ error: "This staff account is deactivated." });
    }

    await prisma.service_provider_staff
      .update({ where: { id: staff.id }, data: { last_login: new Date() } })
      .catch(() => {});

    const token = jwt.sign(
      {
        id: staff.id,
        email: staff.email,
        internal_role: staff.internal_role,
      },
      process.env.SP_JWT_SECRET,
      { expiresIn: process.env.SP_JWT_EXPIRY || "8h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: staff.id,
        full_name: staff.full_name,
        email: staff.email,
        internal_role: staff.internal_role,
      },
    });
  } catch (err) {
    console.error("Staff login error:", err);
    return res.status(500).json({
      error: "Sign-in failed. Please try again.",
    });
  }
};

module.exports = { login };
