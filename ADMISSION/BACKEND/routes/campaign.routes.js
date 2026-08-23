import express from 'express';
import {
  createCampaign,
  getCampaigns,
  sendCampaign,
} from '../controllers/campaign.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createCampaign);
router.get('/', getCampaigns);
router.post('/:id/send', sendCampaign);

export default router;
