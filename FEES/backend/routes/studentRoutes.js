import express from 'express';
import * as studentController from '../controllers/studentController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { createStudentSchema, updateStudentSchema } from '../validators/studentValidator.js';

const router = express.Router();

// Protected routes - require authentication
router.use(authenticateToken);

router.post('/', 
  authorizeRole('admin', 'accountant'),
  validateRequest(createStudentSchema),
  studentController.createStudent
);

router.get('/search', studentController.searchStudents);

router.get('/:id', studentController.getStudent);

router.put('/:id',
  authorizeRole('admin', 'accountant'),
  validateRequest(updateStudentSchema),
  studentController.updateStudent
);

router.delete('/:id',
  authorizeRole('admin'),
  studentController.deleteStudent
);

router.post('/bulk-upload',
  authorizeRole('admin'),
  studentController.bulkUploadStudents
);

export default router;
