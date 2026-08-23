const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// GET /api/super-admin/staff — List internal staff users
const getAllStaff = async (req, res) => {
  try {
    const staff = await prisma.service_provider_staff.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        internal_role: true,
        is_active: true,
        created_at: true,
        last_login: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return res.json({ staff });
  } catch (err) {
    console.error('Get staff error:', err);
    return res.status(500).json({ error: 'Failed to fetch staff members.' });
  }
};

// POST /api/super-admin/staff — Create internal staff user
const createStaff = async (req, res) => {
  try {
    const { full_name, email, password, internal_role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const role = internal_role || 'support';
    const allowedRoles = ['super_admin', 'support', 'billing'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role value.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const staff = await prisma.service_provider_staff.create({
      data: {
        full_name,
        email,
        password_hash,
        internal_role: role,
        is_active: true,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        internal_role: true,
        is_active: true,
        created_at: true,
      },
    });

    return res.status(201).json({
      message: 'Staff member created successfully.',
      staff,
    });
  } catch (err) {
    console.error('Create staff error:', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Staff email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create staff member.' });
  }
};

module.exports = { getAllStaff, createStaff };