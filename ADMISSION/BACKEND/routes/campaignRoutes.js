import express from 'express';
import {
  createCampaign,
  getCampaigns,
  sendCampaign,
} from '../controllers/campaignController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createCampaign);
router.get('/', getCampaigns);
router.post('/:id/send', sendCampaign);

export default router;
