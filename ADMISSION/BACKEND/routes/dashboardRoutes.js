import express from 'express';
import {
  getDashboardStats,
  getMonthlyTrend,
  getGradeDistribution,
  getCounselorPerformance,
} from '../src/controllers/dashboardController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', authMiddleware, getDashboardStats);
router.get('/dashboard/monthly-trend', authMiddleware, getMonthlyTrend);
router.get('/dashboard/grade-distribution', authMiddleware, getGradeDistribution);
router.get('/dashboard/counselor-performance', authMiddleware, getCounselorPerformance);

export default router;
