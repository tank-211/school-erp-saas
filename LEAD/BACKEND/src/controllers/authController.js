import {
  registerService,
  loginService,
  getCurrentUserService,
  updateProfileService,
  changePasswordService,
} from "../services/authService.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const register = async (req, res) => {
  try {
    console.log("🔥 RAW BODY:", req.body);

    const result = await registerService(req.body);
    res.status(201).json(successResponse(result, "User registered successfully"));
  } catch (error) {
    console.log("❌ REGISTER ERROR:", error.message);
    res.status(400).json(errorResponse(error.message));
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginService(req.body.email, req.body.password);
    res.status(200).json(successResponse(result, "Login successful"));
  } catch (error) {
    res.status(401).json(errorResponse(error.message));
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    console.log("🔥 CONTROLLER req.user:", req.user);
    const user = await getCurrentUserService(req.user.id); // ✅ FIX

    res.status(200).json(successResponse(user, "User retrieved successfully"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await updateProfileService(req.user.id, req.body);
    res.status(200).json(successResponse(user, "Profile updated successfully"));
  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
};

export const changePassword = async (req, res) => {
  try {
const result = await changePasswordService(
  req.user.id,
  req.body.currentPassword,
  req.body.newPassword
);
    res.status(200).json(successResponse(result, "Password changed successfully"));
  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
};
