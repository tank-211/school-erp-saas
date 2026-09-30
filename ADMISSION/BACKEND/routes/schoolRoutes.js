import express from 'express';
import { getAllSchools, getSchoolById, createSchool, getSchoolCounselors, getOwnSchool, updateOwnSchool } from '../controllers/schoolController.js';
import { authMiddleware, requireSchool, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// A school user may only see their own school. Creating schools is a platform
// action done in the Super Admin portal (POST /api/super-admin/schools).
router.use(authMiddleware, requireSchool);

// Get the caller's own school (kept as a list for response compatibility)
router.get('/', getAllSchools);

// The caller's own school: read for anyone, edit contact details for admins
router.get('/me', getOwnSchool);
router.put('/me', isAdmin, updateOwnSchool);

// Get school by ID (own school only)
router.get('/:id', getSchoolById);

// Get counselors for a school (own school only)
router.get('/:schoolId/counselors', getSchoolCounselors);

// Create new school: disabled here, returns 403
router.post('/', createSchool);

export default router;
