import express from 'express';
import { getUsers, createUser, updatePassword, deleteUser } from '../controllers/adminController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(isAdmin);

// GET /api/admin/users
router.get('/users', getUsers);

// POST /api/admin/create-user
router.post('/create-user', createUser);

// PUT /api/admin/update-password/:id
router.put('/update-password/:id', updatePassword);

// DELETE /api/admin/delete-user/:id
router.delete('/delete-user/:id', deleteUser);

export default router;
