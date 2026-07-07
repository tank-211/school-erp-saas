import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getAllUsers, inviteUser, updateUserRole,toggleUserStatus } from "../controllers/userController.js";

const router = express.Router();

router.get("/", authMiddleware, getAllUsers);
router.post("/invite", authMiddleware, inviteUser);
router.put("/:id/role",authMiddleware,updateUserRole);
router.put("/:id/status",authMiddleware,toggleUserStatus);

export default router;