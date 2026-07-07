import express from "express";

import {
  getSettings,
  updateProfile,
  updateNotifications,
  updateSystem,
  changePassword,
  toggle2FA,
  getSettingsLogs
} from "../controllers/settingsController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 protect all routes
router.use(authMiddleware);

// ✅ SETTINGS ROUTES ONLY
router.get("/", getSettings);

router.put("/profile", updateProfile);
router.put("/notifications", updateNotifications);
router.put("/system", updateSystem);
router.put("/password", changePassword);
router.put("/2fa", toggle2FA);
router.get("/logs", getSettingsLogs);

export default router;