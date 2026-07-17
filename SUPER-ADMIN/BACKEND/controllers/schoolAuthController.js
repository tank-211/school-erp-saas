const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const schoolLogin = async (req, res) => {
  try {
    const { school_id, email, password } = req.body;

    if (!school_id || !email || !password) {
      return res.status(400).json({ error: 'school_id, email and password are required.' });
    }

    const user = await prisma.app_user.findFirst({
      where: {
        school_id,
        email,
      },
      select: {
        id: true,
        school_id: true,
        name: true,
        email: true,
        password_hash: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account is not active.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
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
