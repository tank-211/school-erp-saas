import express from 'express';
import {
  getCommunicationLogs,
  getRecipients,
  sendCommunication,
  updateCommunicationStatus,
} from '../controllers/communicationController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireSchool } from '../middleware/auth.js';
import prisma from '../src/lib/prisma.js';
import { communicationAttachmentsUpload } from '../middleware/communicationUpload.js';

const router = express.Router();

router.use(authMiddleware);

// Messages that actually went out, per channel (failed attempts not counted)
router.get('/channel-stats', requireSchool, async (req, res, next) => {
  try {
    const rows = await prisma.communication_log.groupBy({
      by: ['channel'],
      where: { school_id: req.schoolId, status: 'sent' },
      _count: { _all: true },
    });
    const count = (channel) => rows.find((r) => r.channel === channel)?._count?._all || 0;
    res.json({ success: true, data: { sms: count('sms'), whatsapp: count('whatsapp'), email: count('email') } });
  } catch (error) {
    next(error);
  }
});
router.get('/recipients', getRecipients);
router.post('/send', communicationAttachmentsUpload, sendCommunication);
router.get('/logs', getCommunicationLogs);
router.put('/:id/status', updateCommunicationStatus);

export default router;
