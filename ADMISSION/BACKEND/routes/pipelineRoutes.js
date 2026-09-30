import express from 'express';
import { getPipeline, moveLeadStage } from '../controllers/pipelineController.js';
import { authMiddleware, requireSchool } from '../middleware/auth.js';

const router = express.Router();

// Caller's school only (req.schoolId from the token)
router.use(authMiddleware, requireSchool);

router.get('/', getPipeline);
router.patch('/leads/:id/stage', moveLeadStage);

export default router;
