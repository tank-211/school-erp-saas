import bcrypt from 'bcryptjs';
import * as userQueries from '../db/queries/userQueries.js';
import * as authQueries from '../db/queries/authQueries.js';
import prisma from '../src/lib/prisma.js';

export const getUsers = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const users = await userQueries.getUsersBySchoolId(school_id);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;
    const { school_id } = req.user;
    
    if (!email || !password || !role || !name) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
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

export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Admins can reset anyone's password, users can reset their own
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.id !== parseInt(id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await userQueries.updatePassword(id, password_hash);
    
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch(err) {
    next(err);
  }
};
