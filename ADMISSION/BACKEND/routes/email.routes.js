import express from 'express';
import {
  createTemplate,
  deleteTemplate,
  getEmailLogs,
  getEmailStats,
  getRecipients,
  getTemplates,
  resolveApplicationRecipient,
  sendEmail,
  updateEmailStatus,
  updateTemplate,
} from '../controllers/email.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/send', sendEmail);
router.post('/resolve-recipient', resolveApplicationRecipient);
router.get('/logs', getEmailLogs);
router.get('/stats', getEmailStats);
router.put('/:id/status', updateEmailStatus);

router.post('/templates', createTemplate);
router.get('/templates', getTemplates);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

router.get('/recipients', getRecipients);

export default router;
