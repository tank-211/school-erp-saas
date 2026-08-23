import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead
} from "../controllers/notificationController.js";

const router = express.Router();

// ✅ DEFINE ROUTES AFTER router init
router.get("/", authMiddleware, getNotifications);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.patch("/:id/read", authMiddleware, markAsRead);

export default router;