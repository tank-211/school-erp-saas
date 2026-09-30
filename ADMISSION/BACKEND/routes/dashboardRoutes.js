import express from 'express';
import {
  getDashboardStats,
  getFunnel,
  getMonthlyTrend,
  getGradeDistribution,
  getCounselorPerformance,
  getInactivityAlerts,
} from '../src/controllers/dashboardController.js';
import { authMiddleware, requireSchool } from '../middleware/auth.js';

const router = express.Router();

// All figures are for the caller's school only (req.schoolId from the token)
router.get('/dashboard', authMiddleware, requireSchool, getDashboardStats);
router.get('/dashboard/funnel', authMiddleware, requireSchool, getFunnel);
router.get('/dashboard/monthly-trend', authMiddleware, requireSchool, getMonthlyTrend);
router.get('/dashboard/grade-distribution', authMiddleware, requireSchool, getGradeDistribution);
router.get('/dashboard/counselor-performance', authMiddleware, requireSchool, getCounselorPerformance);
router.get('/dashboard/inactivity-alerts', authMiddleware, requireSchool, getInactivityAlerts);

export default router;
