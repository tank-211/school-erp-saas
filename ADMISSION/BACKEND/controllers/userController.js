import bcrypt from 'bcryptjs';
import * as userQueries from '../db/queries/userQueries.js';
import * as authQueries from '../db/queries/authQueries.js';
import prisma from '../src/lib/prisma.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';
import { ASSIGNABLE_ROLES } from './authController.js';
import { recordAudit } from '../utils/audit.js';

// All handlers run after authMiddleware + requireSchool, so req.schoolId is the
// caller's school (BigInt) taken from the token.

export const getUsers = async (req, res, next) => {
  try {
    const users = await userQueries.getUsersBySchoolId(req.schoolId);
    res.status(200).json({ success: true, data: serializeBigInt(users) });
  } catch (err) {
    next(err);
  }
};

// POST /api/users (isAdmin): create a user in the admin's own school.
export const createUser = async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
      });
    }

    const existingUser = await prisma.app_user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await authQueries.createUser({
      school_id: req.schoolId, name, email, password_hash, role
    });

    const { password_hash: _omit, ...safeUser } = newUser;
    await recordAudit(req, { action: 'user.created', entity: 'app_user', entityId: safeUser.id, summary: `Created user ${safeUser.email || ''}` });
    res.status(201).json({ success: true, data: serializeBigInt(safeUser), message: 'User created successfully' });
  } catch(err) {
    next(err);
  }
};

// PUT /api/users/:id/reset-password
// A user may reset their own password. Resetting someone else's requires an
// active admin account (checked in the database, not the token) and the target
// must belong to the same school. Cross-school resets are done in Super Admin.
export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const targetId = BigInt(id);

    const target = await prisma.app_user.findFirst({
      where: { id: targetId, school_id: req.schoolId },
      select: { id: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isSelf = String(req.user.id) === String(targetId);

    if (!isSelf) {
      const caller = await authQueries.getUserById(req.user.id);
      const callerIsAdmin =
        caller &&
        caller.status === 'active' &&
        BigInt(caller.school_id) === req.schoolId &&
        (caller.role === 'admin' || caller.role === 'super_admin');

      if (!callerIsAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await userQueries.updatePassword(targetId, password_hash);

    await recordAudit(req, {
      action: isSelf ? 'user.password_changed' : 'user.password_reset',
      entity: 'app_user',
      entityId: targetId,
      summary: isSelf ? 'Changed own password' : `Reset password of user ${targetId}`,
    });
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch(err) {
    next(err);
  }
};
