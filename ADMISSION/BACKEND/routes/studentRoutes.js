import express from 'express';
import { getAllStudents, getStudentById, createStudent, saveStudent } from '../controllers/studentController.js';

const router = express.Router();
/**
 * Student Routes
 * Base path: /api/students
 */

// GET all students with pagination
router.get('/', getAllStudents);

// GET student by ID with details (parents, admissions)
router.get('/:id', getStudentById);

// POST create new student
router.post('/', createStudent);

// POST save student
router.post('/save', saveStudent);

export default router;
