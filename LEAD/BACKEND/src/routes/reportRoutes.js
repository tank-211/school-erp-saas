import express from "express";
import { salesReport, performanceReport, leadReport, lookups } from "../controllers/reportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

// Dropdown values: the school's classes, academic years, lead sources, counselors
router.get("/lookups", lookups);
// Fee collection for an academic year (?academic_year_id=)
router.get("/sales", salesReport);
// Counselor performance for a date range (?from=YYYY-MM-DD&to=YYYY-MM-DD)
router.get("/performance", performanceReport);
// Filtered lead list (?desired_class=&source=&status=&counselor=&from=&to=)
router.get("/leads", leadReport);

export default router;
