import express from 'express';
import * as applicationController from '../controllers/applicationController.js';
import { authMiddleware } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { validateApplicationDocumentTypes } from '../middleware/validateApplicationDocumentTypes.js';

const router = express.Router();

// Apply auth middleware to all application routes
router.use(authMiddleware);

/**
 * New admission workflow routes
 */
router.post('/start', applicationController.startAdmission);
router.post('/save-step', applicationController.saveAdmissionStep);
router.get('/resume/:id', applicationController.getAdmissionApplication);
router.post('/complete', applicationController.completeAdmission);

router.get('/eligible-leads', applicationController.getEligibleLeads);
router.get('/counts', applicationController.getApplicationCounts);
router.get('/search', applicationController.searchApplications);
router.get('/', applicationController.getApplications);
router.get('/draft', applicationController.getDraftApplications);
router.get('/:id/resume', applicationController.resumeApplication);
router.post('/new', applicationController.createApplicationWithoutLead);

/**
 * POST /api/applications
 * Create a new application from lead
 */
router.post('/', applicationController.createApplication);

/**
 * GET /api/applications/:id/progress
 * Get application progress status
 */
router.get('/:id/progress', applicationController.getApplicationProgress);

/**
 * GET /api/applications/:id/details
 * Get full application details (for prefill)
 */
router.get('/:id/details', applicationController.getApplicationDetails);

/**
 * POST /api/applications/:id/student-info
 * Save student information (Step 1)
 */
router.post('/:id/student-info', applicationController.saveStudentInfo);

/**
 * POST /api/applications/:id/parent-info
 * Save parent information (Step 2)
 */
router.post('/:id/parent-info', applicationController.saveParentInfo);

/**
 * POST /api/applications/:id/academic-info
 * Save academic information (Step 3)
 */
router.post('/:id/academic-info', applicationController.saveAcademicInfo);

/**
 * POST /api/applications/:id/documents
 * Save documents (Step 5)
 */
router.post(
	'/:id/documents',
	upload.any(),
	validateApplicationDocumentTypes,
	applicationController.saveDocuments,
);

/**
 * POST /api/applications/:id/submit
 * Submit final application (Step 6)
 */
router.post('/:id/submit', applicationController.submitApplication);

/**
 * DELETE /api/applications/:id
 * Delete draft application (only allows deletion if status is 'draft')
 */
router.delete('/:id', applicationController.deleteApplication);

/**
 * Alias endpoint for compatibility with /api/admission/:id
 */
router.get('/:id', applicationController.getApplicationDetails);

export default router;
