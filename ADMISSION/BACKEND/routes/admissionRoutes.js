import express from 'express';
import * as admissionController from '../controllers/admissionController.js';
import { authMiddleware, requireSchool } from '../middleware/auth.js';
import { requireOwnedAdmission, requireOwnedLeadFromBody } from '../middleware/tenantGuards.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Every route is school-scoped: requireSchool sets req.schoolId from the token.
router.use(authMiddleware, requireSchool);

/**
 * GET /api/admissions/stats
 * Get admission statistics (total, submitted, under_review, approved, waitlisted)
 */ 
router.get('/stats', admissionController.getAdmissionStats);

/**
 * POST /api/admissions/create
 * Create a new admission
 */
router.post('/create', upload.any(), admissionController.createAdmission);

/**
 * GET /api/admissions/search?query=
 * Search admissions by student name or parent contact
 * Query parameters: query (required)
 */
router.get('/search', admissionController.searchAdmissions);

/**
 * GET /api/admissions
 * Get all admissions with pagination
 * Query parameters: limit (default 10), offset (default 0)
 */
router.get('/', admissionController.getAllAdmissions);


router.get(
  "/enrollment-stats",
  admissionController.getEnrollmentStats
);

/**
 * GET /api/admissions/:applicationId
 * Get admission details by application ID
 */
router.get('/:applicationId', admissionController.getAdmissionById);

/**
 * POST /api/admissions/create-from-lead
 * Create an application from a lead
 */
router.post('/create-from-lead', requireOwnedLeadFromBody, admissionController.createFromLead);

/**
 * POST /api/admissions/submit
 * Submit a complete admission form
 */
router.post('/submit', requireOwnedAdmission, admissionController.submitAdmission);

/**
 * POST /api/documents/upload
 * Upload a document for an admission
 */
router.post('/documents/upload', requireOwnedAdmission, admissionController.uploadDocument);

/**
 * GET /api/applications/:applicationId/progress
 * Get application progress
 */
router.get('/:applicationId/progress', requireOwnedAdmission, admissionController.getApplicationProgress);

/**
 * PUT /api/applications/:applicationId/progress
 * Update application progress step
 */
router.put('/:applicationId/progress', requireOwnedAdmission, admissionController.updateApplicationProgress);

/**
 * POST /api/admissions/save-academic
 * Save academic details for an admission
 */
router.post('/save-academic', requireOwnedAdmission, admissionController.saveAcademicDetails);

export default router;
