import { Router } from 'express';
import * as studentController from '../controllers/studentController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest, createStudentValidator, paginationValidator } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST - Create student (ADMIN/ACCOUNTANT only)
router.post(
  '/',
  authorize('ADMIN', 'ACCOUNTANT'),
  validateRequest(createStudentValidator),
  studentController.createStudent
);

// GET - Search students
router.get(
  '/search',
  validateRequest(paginationValidator),
  studentController.searchStudents
);

// GET - Student stats
router.get('/stats', studentController.getStudentStats);

// GET - Get student by ID
router.get('/:id', studentController.getStudent);

// PUT - Update student (ADMIN/ACCOUNTANT only)
router.put(
  '/:id',
  authorize('ADMIN', 'ACCOUNTANT'),
  validateRequest(createStudentValidator),
  studentController.updateStudent
);

// DELETE - Delete student (ADMIN only)
router.delete('/:id', authorize('ADMIN'), studentController.deleteStudent);

// POST - Bulk upload students (ADMIN only)
router.post(
  '/bulk-upload',
  authorize('ADMIN'),
  studentController.uploadMiddleware,
  studentController.bulkUploadStudents
);

export default router;
