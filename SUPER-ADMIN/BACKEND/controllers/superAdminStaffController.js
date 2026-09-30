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
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const role = internal_role || 'support';
    const allowedRoles = ['super_admin', 'support', 'billing'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role value.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const staff = await prisma.service_provider_staff.create({
      data: {
        full_name: String(full_name).trim(),
        email: cleanEmail,
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

const ROLES = ['super_admin', 'support', 'billing'];

// PATCH /api/super-admin/staff/:id — change role, name or active state (super_admin only)
const updateStaff = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid staff id.' });
    }
    const { internal_role, is_active, full_name } = req.body || {};

    const target = await prisma.service_provider_staff.findUnique({
      where: { id },
      select: { id: true, internal_role: true, is_active: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    const data = {};
    if (internal_role !== undefined) {
      if (!ROLES.includes(internal_role)) {
        return res.status(400).json({ error: 'Invalid role value.' });
      }
      data.internal_role = internal_role;
    }
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be true or false.' });
      }
      data.is_active = is_active;
    }
    if (full_name !== undefined) {
      if (!String(full_name).trim()) {
        return res.status(400).json({ error: 'Name cannot be empty.' });
      }
      data.full_name = String(full_name).trim().slice(0, 150);
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const self = Number(req.staffUser?.id) === id;
    const losesSuperAdmin =
      target.internal_role === 'super_admin' && target.is_active &&
      ((data.internal_role && data.internal_role !== 'super_admin') || data.is_active === false);

    // Nobody can lock themselves out, and the platform always keeps a super admin
    if (self && losesSuperAdmin) {
      return res.status(400).json({ error: 'You cannot remove your own super admin access.' });
    }
    if (self && data.is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }
    if (losesSuperAdmin) {
      const others = await prisma.service_provider_staff.count({
        where: { internal_role: 'super_admin', is_active: true, NOT: { id } },
      });
      if (others === 0) {
        return res.status(400).json({ error: 'At least one active super admin must remain.' });
      }
    }

    const staff = await prisma.service_provider_staff.update({
      where: { id },
      data,
      select: { id: true, full_name: true, email: true, internal_role: true, is_active: true, created_at: true, last_login: true },
    });
    return res.json({ message: 'Staff member updated.', staff });
  } catch (err) {
    console.error('Update staff error:', err.message);
    return res.status(500).json({ error: 'Failed to update staff member.' });
  }
};

module.exports = { getAllStaff, createStaff, updateStaff };