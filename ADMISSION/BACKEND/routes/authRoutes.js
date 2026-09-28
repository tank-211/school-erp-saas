/**
 * routes/authRoutes.js
 * Authentication routes
 * Base path: /api/auth
 */

import express from 'express';
import { login, signup, me, superAdminLogin } from '../controllers/authController.js';
import { authMiddleware, isAdmin, requireSchool } from '../middleware/auth.js';
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
 * Create a user in the caller's own school.
 * Requires a logged-in, active school admin. The school always comes from the
 * admin's token; school_id in the body is ignored. Public self-signup is closed
 * because it let anyone create an admin in any school.
 */
router.post('/signup', authMiddleware, requireSchool, isAdmin, signup);

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Requires JWT token
 */
router.get('/me', authMiddleware, me);

export default router;
