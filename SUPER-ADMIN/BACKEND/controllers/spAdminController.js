const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

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

    const existingStaff = await prisma.service_provider_staff.findUnique({
      where: {
        email: trimmedEmail,
      },
    });

    if (existingStaff) {
      return res.status(409).json({
        error: 'An employee with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await prisma.service_provider_staff.create({
      data: {
        full_name: trimmedName,
        email: trimmedEmail,
        password_hash: passwordHash,
        internal_role: role,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        internal_role: true,
        created_at: true,
      },
    });

    return res.status(201).json({
      message: 'Internal employee registered successfully.',
      user,
    });
  } catch (err) {
    console.error('SP signup error:', err);
    return res.status(500).json({ error: 'Failed to register internal employee.' });
  }
};

module.exports = { signup };