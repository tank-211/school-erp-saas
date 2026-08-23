import bcrypt from 'bcryptjs';
import * as adminQueries from '../db/queries/adminQueries.js';
import * as authQueries from '../db/queries/authQueries.js';
import prisma from '../src/lib/prisma.js';

export const getUsers = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const users = await adminQueries.getUsersBySchoolId(school_id);

    const formattedUsers = users.map(user => ({
      ...user,
      id: Number(user.id),
      school_id: Number(user.school_id)
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;
    const { school_id } = req.user;
    
    if (!email || !password || !role || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Administrative roles must be provisioned by the Service Provider' });
    }

    const existingUser = await authQueries.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await authQueries.createUser({
      school_id, name, email, password_hash, role
    });

    res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });
  } catch(err) {
    next(err);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const { school_id } = req.user;
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const updated = await adminQueries.updatePassword(id, school_id, password_hash);
    if (!updated) {
        return res.status(404).json({ success: false, message: 'User not found or you do not have permission to modify this user' });
    }
    
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch(err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { school_id } = req.user;
    
    // Optional: Prevent deleting self
    if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const deleted = await adminQueries.deleteUser(id, school_id);
    if (!deleted) {
        return res.status(404).json({ success: false, message: 'User not found or you do not have permission to delete this user' });
    }

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch(err) {
    next(err);
  }
};
