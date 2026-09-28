import express from 'express';
import { getAllStudents, getStudentById, createStudent, saveStudent } from '../controllers/studentController.js';
import { authMiddleware, requireSchool } from '../middleware/auth.js';

const router = express.Router();

// Students are school-owned data: login required, scoped to the token's school.
router.use(authMiddleware, requireSchool);

router.get('/', getAllStudents);

router.get('/:id', getStudentById);

router.post('/', createStudent);

router.post('/save', saveStudent);

export default router;
