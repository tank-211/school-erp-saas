import express from "express";
import {
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createLoginLimiter } from "../utils/loginLimiter.js";
import {
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../utils/validators.js";

const router = express.Router();

// Login: 10 failed attempts per IP + email, 50 per IP, in 15 minutes.
export const loginLimiter = createLoginLimiter();

// No public sign-up: Super Admin creates schools and their admin accounts.
router.post("/login", loginLimiter, validate(loginSchema), login);
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, validate(updateProfileSchema), updateProfile);
router.post("/change-password", authMiddleware, validate(changePasswordSchema), changePassword);

export default router;
