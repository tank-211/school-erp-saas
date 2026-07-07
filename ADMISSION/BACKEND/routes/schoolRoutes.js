import express from 'express';
import { getAllSchools, getSchoolById, createSchool, getSchoolCounselors } from '../controllers/schoolController.js';

const router = express.Router();
/**
 * School Routes
 * Base path: /api/schools
 */

// GET all schools
router.get('/', getAllSchools);

// GET school by ID
router.get('/:id', getSchoolById);

// GET school counselors by ID
router.get('/:schoolId/counselors', getSchoolCounselors);

// POST create new school
router.post('/', createSchool);

export default router;
