import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  sendWhatsAppNotification,
  sendSMSNotification,
  sendEmailNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Send WhatsApp notification
router.post('/whatsapp', authMiddleware, sendWhatsAppNotification);

// Send SMS notification
router.post('/sms', authMiddleware, sendSMSNotification);

// Send Email notification
router.post('/email', authMiddleware, sendEmailNotification);

export default router;
