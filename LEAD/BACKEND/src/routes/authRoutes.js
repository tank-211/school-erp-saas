import express from "express";
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createLoginLimiter } from "../utils/loginLimiter.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../utils/validators.js";

const router = express.Router();

// Login: 10 failed attempts per IP + email, 50 per IP, in 15 minutes.
export const loginLimiter = createLoginLimiter();
// Registration creates a new school: at most 5 per IP per hour, successful or not.
export const registerLimiter = createLoginLimiter({
  windowMs: 60 * 60 * 1000,
  maxPerAccount: 5,
  maxPerIp: 5,
  countAll: true,
  message: "Too many sign-up attempts from this network. Please try again later.",
});

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, validate(updateProfileSchema), updateProfile);
router.post("/change-password", authMiddleware, validate(changePasswordSchema), changePassword);

export default router;
