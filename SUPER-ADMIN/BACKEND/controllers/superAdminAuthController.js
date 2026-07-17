const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const staff = await prisma.service_provider_staff.findUnique({
      where: {
        email,
      },
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
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
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
      await prisma.service_provider_staff.update({
        where: {
          id: staff.id,
        },
        data: {
          last_login: new Date(),
        },
      });

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
