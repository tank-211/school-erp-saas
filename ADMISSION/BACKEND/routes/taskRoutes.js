import express from 'express';
import { authMiddleware, requireSchool } from '../middleware/auth.js';
import { listAdmissionTasks, createAdmissionTask, updateAdmissionTask } from '../controllers/taskController.js';

const router = express.Router();
router.use(authMiddleware, requireSchool);
router.get('/', listAdmissionTasks);
router.post('/', createAdmissionTask);
router.patch('/:id', updateAdmissionTask);
export default router;
