import {
  loginService,
  getCurrentUserService,
  updateProfileService,
  changePasswordService,
} from "../services/authService.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const login = async (req, res) => {
  try {
    const result = await loginService(req.body.email, req.body.password);
    res.status(200).json(successResponse(result, "Login successful"));
  } catch (error) {
    // 403 with a code for a suspended/expired school; 401 for bad credentials
    res
      .status(error.status || 401)
      .json({ ...errorResponse(error.message), ...(error.code && { code: error.code }) });
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
