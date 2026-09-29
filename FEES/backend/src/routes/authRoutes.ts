import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest, loginValidator, registerValidator } from '../middleware/validation';
import { createLoginLimiter } from '../utils/loginLimiter';

const router = Router();

// 10 failed attempts per IP + email, 50 per IP, in 15 minutes
export const loginLimiter = createLoginLimiter();

// Admin-only: create a user in the caller's own school.
// Public self-registration is closed because it let anyone create an account
// (with any role) in any school. The school always comes from the token.
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  validateRequest(registerValidator),
  authController.register
);

// Public routes
router.post(
  '/login',
  loginLimiter,
  validateRequest(loginValidator),
  authController.login
);

router.post(
  '/refresh-token',
  authController.refreshToken
);

// Protected routes
router.use(authenticate);

router.get('/profile', authController.getProfile);

router.put('/profile', authController.updateProfile);

router.get('/users', authorize('ADMIN'), authController.listUsers);

router.patch('/users/:id/toggle-status', authorize('ADMIN'), authController.toggleUserStatus);

export default router;
