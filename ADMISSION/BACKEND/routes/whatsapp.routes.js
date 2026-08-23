import express from 'express';
import { getWhatsappLogs, sendWhatsapp } from '../controllers/whatsapp.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/send', sendWhatsapp);
router.get('/logs', getWhatsappLogs);

export default router;
