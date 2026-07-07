import express from 'express';
import * as admissionController from '../controllers/admissionController.js';
import { authMiddleware } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(authMiddleware);

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

/**
 * GET /api/admissions/:applicationId
 * Get admission details by application ID
 */
router.get('/:applicationId', admissionController.getAdmissionById);

/**
 * POST /api/admissions/create-from-lead
 * Create an application from a lead
 */
router.post('/create-from-lead', admissionController.createFromLead);

/**
 * POST /api/admissions/submit
 * Submit a complete admission form
 */
router.post('/submit', admissionController.submitAdmission);

/**
 * POST /api/documents/upload
 * Upload a document for an admission
 */
router.post('/documents/upload', admissionController.uploadDocument);

/**
 * GET /api/applications/:applicationId/progress
 * Get application progress
 */
router.get('/:applicationId/progress', admissionController.getApplicationProgress);

/**
 * PUT /api/applications/:applicationId/progress
 * Update application progress step
 */
router.put('/:applicationId/progress', admissionController.updateApplicationProgress);

/**
 * POST /api/admissions/save-academic
 * Save academic details for an admission
 */
router.post('/save-academic', admissionController.saveAcademicDetails);

export default router;
