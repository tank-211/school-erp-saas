import express from 'express';
import * as authController from '../controllers/authController.js';
import { validateRequest } from '../middleware/validation.js';
import { loginSchema, createUserSchema } from '../validators/authValidator.js';

const router = express.Router();

router.post('/register', validateRequest(createUserSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

export default router;
