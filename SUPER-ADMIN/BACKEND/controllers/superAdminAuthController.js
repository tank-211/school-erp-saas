const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const login = async (req, res) => {
  try {
    console.log("=== LOGIN START ===");
    console.log("Body:", req.body);

    const { email, password } = req.body;

    const staff = await prisma.service_provider_staff.findUnique({
      where: { email },
      select: {
        id: true,
        full_name: true,
        email: true,
        password_hash: true,
        internal_role: true,
        is_active: true,
      },
    });

    console.log("Staff:", staff);

    if (!staff) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    console.log("Comparing password...");
    const isValidPassword = await bcrypt.compare(password, staff.password_hash);
    console.log("Password valid:", isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    console.log("Generating token...");
    const token = jwt.sign(
      {
        id: staff.id,
        email: staff.email,
        internal_role: staff.internal_role,
      },
      process.env.SP_JWT_SECRET,
      { expiresIn: process.env.SP_JWT_EXPIRY || "8h" }
    );

    console.log("Updating last_login...");
    await prisma.service_provider_staff.update({
      where: { id: staff.id },
      data: { last_login: new Date() },
    });

    console.log("Login successful");

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
    console.error("LOGIN ERROR");
    console.error(err);
    return res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = { login };
