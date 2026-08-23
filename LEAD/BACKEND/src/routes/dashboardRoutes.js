import express from "express";
import {
  getDashboard,
  getStats,
  getMetrics,
  getEnrollmentTrend,
  getStatusDistribution,
  getTodayOverview,
  getGradeDistribution,
} from "../controllers/dashboardController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getDashboard);
router.get("/stats", getStats);
router.get("/metrics", getMetrics);
router.get("/enrollment-trend", getEnrollmentTrend);
router.get("/status-distribution", getStatusDistribution);
router.get("/grade-distribution", getGradeDistribution);
router.get("/today-overview", getTodayOverview);

export default router;
