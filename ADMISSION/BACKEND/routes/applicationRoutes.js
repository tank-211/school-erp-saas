import express from 'express';
import * as applicationController from '../controllers/applicationController.js';
import { authMiddleware, requireSchool } from '../middleware/auth.js';
import { requireOwnedApplication } from '../middleware/tenantGuards.js';
import upload from '../middleware/upload.js';
import { validateApplicationDocumentTypes } from '../middleware/validateApplicationDocumentTypes.js';

const router = express.Router();

// Apply auth middleware to all application routes. Every route is school-scoped:
// requireSchool sets req.schoolId from the token.
router.use(authMiddleware, requireSchool);

/**
 * New admission workflow routes
 */
router.post('/start', applicationController.startAdmission);

// Start admission from an approved application
router.post(
  '/start-from-approved',
  applicationController.startAdmissionFromApprovedApplication
);

router.post( '/save-step', upload.any(), applicationController.saveAdmissionStep );
router.get('/resume/:id', applicationController.getAdmissionApplication);
router.post('/complete', applicationController.completeAdmission);
/**
 * POST /api/applications/admission-document
 * Upload or replace a document during admission
 */

router.get('/eligible-leads', applicationController.getEligibleLeads);
router.get('/counts', applicationController.getApplicationCounts);
router.get('/search', applicationController.searchApplications);
router.get('/draft', applicationController.getDraftApplications);
router.get('/by-lead/:leadId', applicationController.getApplicationByLeadId);

router.post('/new', applicationController.createApplicationWithoutLead);

router.get('/:id/resume', applicationController.resumeApplication);

/**
 * GET /api/applications
 * Get all applications for the logged-in school
 */
router.get('/', applicationController.getApplications);

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
router.post('/:id/student-info', requireOwnedApplication, applicationController.saveStudentInfo);

/**
 * POST /api/applications/:id/parent-info
 * Save parent information (Step 2)
 */
router.post('/:id/parent-info', requireOwnedApplication, applicationController.saveParentInfo);

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
	requireOwnedApplication, // before multer so no file is stored for another school's application
	upload.any(),
	validateApplicationDocumentTypes,
	applicationController.saveDocuments,
);

/**
 * POST /api/applications/:id/submit
 * Submit final application (Step 6)
 */
router.post('/:id/submit', requireOwnedApplication, applicationController.submitApplication);

/**
 * PATCH /api/applications/:id/review
 * Move submitted application to under review
 */
router.patch(
  '/:id/review',
  applicationController.moveApplicationToReview
);

router.patch('/:id/approve', applicationController.approveApplication);
router.patch('/:id/reject', applicationController.rejectApplication);

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
