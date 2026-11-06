import express from 'express';
import * as applicationController from '../controllers/applicationController.js';
import { authMiddleware, requireSchool } from '../middleware/auth.js';
import { requireOwnedApplication } from '../middleware/tenantGuards.js';
import upload from '../middleware/upload.js';
import { validateApplicationDocumentTypes } from '../middleware/validateApplicationDocumentTypes.js';

const router = express.Router();

// Apply authentication and tenant context to every application endpoint.
router.use(authMiddleware, requireSchool);

/**
 * New admission workflow routes
 */
router.post('/start', applicationController.startAdmission);
router.post('/start-from-approved', applicationController.startAdmissionFromApprovedApplication);
router.post('/save-step', upload.any(), applicationController.saveAdmissionStep);
router.get('/resume/:id', requireOwnedApplication, applicationController.getAdmissionApplication);
router.post('/complete', applicationController.completeAdmission);

router.get('/eligible-leads', applicationController.getEligibleLeads);
router.get('/counts', applicationController.getApplicationCounts);
router.get('/search', applicationController.searchApplications);
router.get('/draft', applicationController.getDraftApplications);
router.get('/by-lead/:leadId', applicationController.getApplicationByLeadId);

router.post('/new', applicationController.createApplicationWithoutLead);
router.get('/:id/resume', requireOwnedApplication, applicationController.resumeApplication);

/** List and create applications for the authenticated school. */
router.get('/', applicationController.getApplications);
router.post('/', applicationController.createApplication);

/** Every endpoint addressing an existing application must verify ownership. */
router.get('/:id/progress', requireOwnedApplication, applicationController.getApplicationProgress);
router.get('/:id/details', requireOwnedApplication, applicationController.getApplicationDetails);
router.post('/:id/student-info', requireOwnedApplication, applicationController.saveStudentInfo);
router.post('/:id/parent-info', requireOwnedApplication, applicationController.saveParentInfo);
router.post('/:id/academic-info', requireOwnedApplication, applicationController.saveAcademicInfo);

// Check ownership before multer writes any uploaded files to disk.
router.post(
  '/:id/documents',
  requireOwnedApplication,
  upload.any(),
  validateApplicationDocumentTypes,
  applicationController.saveDocuments,
);
router.post('/:id/submit', requireOwnedApplication, applicationController.submitApplication);
router.patch('/:id/review', requireOwnedApplication, applicationController.moveApplicationToReview);
router.patch('/:id/approve', requireOwnedApplication, applicationController.approveApplication);
router.patch('/:id/reject', requireOwnedApplication, applicationController.rejectApplication);
router.delete('/:id', requireOwnedApplication, applicationController.deleteApplication);

// Compatibility alias.
router.get('/:id', requireOwnedApplication, applicationController.getApplicationDetails);

export default router;
