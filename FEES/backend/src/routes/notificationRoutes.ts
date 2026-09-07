import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST - Send WhatsApp notification
router.post('/whatsapp', notificationController.sendWhatsApp);

// POST - Send SMS notification
router.post('/sms', notificationController.sendSMS);

// POST - Send bulk notifications
router.post(
  '/bulk',
  authorize('ADMIN', 'ACCOUNTANT'),
  notificationController.sendBulkNotifications
);

export default router;
