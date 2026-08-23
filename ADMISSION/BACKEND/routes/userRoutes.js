import express from 'express';
import { getUsers, createUser, resetPassword } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/users
router.get('/', getUsers);

// POST /api/users
router.post('/', createUser);

// PUT /api/users/:id/reset-password
router.put('/:id/reset-password', resetPassword);

export default router;
