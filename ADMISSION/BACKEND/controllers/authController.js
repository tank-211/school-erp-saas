/**
 * controllers/authController.js
 * Authentication controller for login/signup
 */
import prisma from '../src/lib/prisma.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as authQueries from '../db/queries/authQueries.js';

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
      process.env.JWT_SECRET,
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

    console.log("LOGIN EMAIL:", email);
    console.log("DB USER:", user);
    console.log("DB HASH:", user?.password_hash);
    console.log("PASSWORD MATCH:", isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: Number(user.id),
        school_id: Number(user.school_id),
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

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
 * signup(req, res, next)
 * POST /api/auth/signup
 * Creates new user and returns JWT token
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, school_id, role } = req.body;

    // Validation
    if (!name || !email || !password || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and school_id are required'
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

    // Check if user exists
    const existingUser = await authQueries.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await authQueries.createUser({
      name,
      email,
      password_hash,
      school_id,
      role: role || 'counselor'
    });

    // Generate token
    const token = jwt.sign(
      {
        id: Number(newUser.id),
        school_id: Number(newUser.school_id),
        role: newUser.role,
        email: newUser.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
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
    console.error('Signup error:', error);
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

  res.status(200).json({
    success: true,
    data: {
      ...user,
      id: Number(user.id),
      school_id: Number(user.school_id)
    }
  });
  } catch (error) {
    console.error('Get me error:', error);
    next(error);
  }
};
