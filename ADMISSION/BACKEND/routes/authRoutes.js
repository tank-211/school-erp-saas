/**
 * routes/authRoutes.js
 * Authentication routes
 * Base path: /api/auth
 */

import express from 'express';
import { login, signup, me, superAdminLogin } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

/**
 * POST /api/auth/login
 * Login user with email and password
 * Returns JWT token
 */
router.post('/login', login);
router.post('/super-admin/login', superAdminLogin);

/**
 * POST /api/auth/signup
 * Create new user account
 * Returns JWT token
 */
router.post('/signup', signup);

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Requires JWT token
 */
router.get('/me', authMiddleware, me);

export default router;
