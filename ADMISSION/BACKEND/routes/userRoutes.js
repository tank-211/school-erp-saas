import express from 'express';
import { getUsers, createUser, resetPassword } from '../controllers/userController.js';
import { authMiddleware, isAdmin, requireSchool } from '../middleware/auth.js';

const router = express.Router();

// Every /api/users route is school-scoped: the school comes from the token.
router.use(authMiddleware, requireSchool);

// GET /api/users
router.get('/', getUsers);

// POST /api/users  (school admins only)
router.post('/', isAdmin, createUser);

// PUT /api/users/:id/reset-password
// Users may reset their own password; admins may reset users in their own school.
router.put('/:id/reset-password', resetPassword);

export default router;
