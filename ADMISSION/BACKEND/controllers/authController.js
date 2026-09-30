/**
 * controllers/authController.js
 * Authentication controller for login/signup
 */
import prisma from '../src/lib/prisma.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwtSecret.js';
import bcrypt from 'bcryptjs';
import * as authQueries from '../db/queries/authQueries.js';
import { getSchoolAccess, denySchoolAccess } from '../utils/schoolAccess.js';
import { recordAudit } from '../utils/audit.js';

/**
 * login(req, res, next)
 * POST /api/auth/login
 * Authenticates user and returns JWT token
 */
export const superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.super_admin.findUnique({
      where: {
        email
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: Number(admin.id),
        role: 'super_admin',
        email: admin.email
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: Number(admin.id),
        name: admin.name,
        email: admin.email,
        role: 'super_admin'
      }
    });

  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Fetch user
    const user = await authQueries.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Suspended or expired schools cannot log in (checked after the password,
    // so the school's status is only revealed to its own users)
    const access = await getSchoolAccess(user.school_id);
    if (!access.allowed) {
      return denySchoolAccess(res, access);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: Number(user.id),
        schoolId: Number(user.school_id),
        role: user.role,
        email: user.email
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    await recordAudit(req, {
      action: 'auth.login',
      entity: 'app_user',
      entityId: user.id,
      schoolId: user.school_id,
      userId: user.id,
      summary: `${user.email} signed in`,
    });

    // Return token and user info
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: Number(user.id),
          name: user.name,
          email: user.email,
          school_id: Number(user.school_id),
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Roles a school admin may assign. super_admin is a platform role and is never
 * assignable from a school-level endpoint.
 */
export const ASSIGNABLE_ROLES = ['admin', 'counselor', 'accountant'];

/**
 * signup(req, res, next)
 * POST /api/auth/signup  (authMiddleware + requireSchool + isAdmin)
 * Creates a user in the calling admin's school. The school comes from the
 * token (req.schoolId); any school_id in the body is ignored. No token is
 * returned for the new user.
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;
    const schoolId = req.schoolId;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const assignedRole = role || 'counselor';
    if (!ASSIGNABLE_ROLES.includes(assignedRole)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`
      });
    }

    // Check if user exists (any status: email is unique across the table)
    const existingUser = await prisma.app_user.findUnique({
      where: { email },
      select: { id: true }
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user in the admin's own school
    const newUser = await authQueries.createUser({
      name,
      email,
      password_hash,
      school_id: schoolId,
      role: assignedRole
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: Number(newUser.id),
          name: newUser.name,
          email: newUser.email,
          school_id: Number(newUser.school_id),
          role: newUser.role
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    next(error);
  }
};

/**
 * me(req, res, next)
 * GET /api/auth/me
 * Returns current authenticated user
 */
export const me = async (req, res, next) => {
  try {
    const user = await authQueries.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

  // Never return the password hash
  const { password_hash, ...safeUser } = user;

  res.status(200).json({
    success: true,
    data: {
      ...safeUser,
      id: Number(user.id),
      school_id: Number(user.school_id)
    }
  });
  } catch (error) {
    console.error('Get me error:', error);
    next(error);
  }
};

/**
 * changePassword(req, res)
 * POST /api/auth/change-password  { current_password, new_password }
 * The signed-in user changes their own password after proving the current one.
 */
export const changePassword = async (req, res, next) => {
  try {
    const current = String(req.body?.current_password || '');
    const next_ = String(req.body?.new_password || '');
    if (!current || !next_) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (next_.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    if (next_ === current) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current one' });
    }

    const user = await prisma.app_user.findFirst({
      where: { id: BigInt(req.user.id), school_id: req.schoolId, status: 'active' },
      select: { id: true, password_hash: true },
    });
    if (!user || !(await bcrypt.compare(current, user.password_hash))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    await prisma.app_user.update({
      where: { id: user.id },
      data: { password_hash: await bcrypt.hash(next_, 10), updated_at: new Date() },
    });
    await recordAudit(req, { action: 'user.password_changed', entity: 'app_user', entityId: user.id, summary: 'Changed own password' });
    res.json({ success: true, message: 'Password changed' });
  } catch (error) {
    next(error);
  }
};
