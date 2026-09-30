import express from 'express';
import { getSecurityOverview, getAuditLogs } from '../controllers/securityController.js';
import { authMiddleware, requireSchool, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// School admins only, caller's school only
router.use(authMiddleware, requireSchool, isAdmin);

router.get('/overview', getSecurityOverview);
router.get('/audit-logs', getAuditLogs);

export default router;
