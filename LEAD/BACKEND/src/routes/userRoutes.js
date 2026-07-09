import express from "express";
import { getAllUsers, inviteUser, updateUserRole,toggleUserStatus, } from "../controllers/userController.js";
import { getCounselors } from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get("/", authMiddleware, getAllUsers);
router.post("/invite", authMiddleware, inviteUser);
router.put("/:id/role",authMiddleware,updateUserRole);
router.put("/:id/status",authMiddleware,toggleUserStatus);
router.get(
  "/counselors",
  authMiddleware,
  getCounselors
);

export default router;

