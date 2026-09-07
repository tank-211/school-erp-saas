import { AuthService } from '../services/authService.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseHelper.js';
import logger from '../config/logger.js';

export const register = async (req, res, next) => {
  try {
    const user = await AuthService.register(req.validatedData);
    return sendSuccessResponse(res, 'User registered successfully', user, 201);
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;
    const result = await AuthService.login(email, password);
    return sendSuccessResponse(res, 'Login successful', result);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return sendErrorResponse(res, error.message, 401);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { userId, refreshToken } = req.body;

    if (!userId || !refreshToken) {
      return sendErrorResponse(res, 'User ID and refresh token are required', 400);
    }

    const result = await AuthService.refreshAccessToken(userId, refreshToken);
    return sendSuccessResponse(res, 'Access token refreshed', result);
  } catch (error) {
    logger.error(`Refresh token error: ${error.message}`);
    return sendErrorResponse(res, error.message, 401);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { userId, refreshToken } = req.body;

    if (!userId || !refreshToken) {
      return sendErrorResponse(res, 'User ID and refresh token are required', 400);
    }

    await AuthService.logout(userId, refreshToken);
    return sendSuccessResponse(res, 'Logout successful');
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};
