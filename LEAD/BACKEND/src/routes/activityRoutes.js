import express from "express";
import {
  createActivity,
  getActivities,
  updateActivity,
  deleteActivity,
  getRecentActivities,
} from "../controllers/activityController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createActivitySchema, updateActivitySchema } from "../utils/validators.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getActivities);
router.post("/", validate(createActivitySchema), createActivity);
router.get("/recent", getRecentActivities);
router.put("/:id", validate(updateActivitySchema), updateActivity);
router.delete("/:id", deleteActivity);

export default router;
