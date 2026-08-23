import express from 'express';
import { getSmsLogs, sendSms } from '../controllers/sms.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/send', sendSms);
router.get('/logs', getSmsLogs);

export default router;
