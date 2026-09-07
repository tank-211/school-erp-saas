import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest, loginValidator, registerValidator } from '../middleware/validation';

const router = Router();

// Public routes
router.post(
  '/register',
  validateRequest(registerValidator),
  authController.register
);

router.post(
  '/login',
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
