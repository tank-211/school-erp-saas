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
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../utils/validators.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, validate(updateProfileSchema), updateProfile);
router.post("/change-password", authMiddleware, validate(changePasswordSchema), changePassword);

export default router;
