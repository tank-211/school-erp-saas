import { Request, Response } from 'express';
import authService from '../services/authService';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

// Roles a school admin may assign (values stored in app_user.role).
const ASSIGNABLE_ROLES = ['admin', 'counselor', 'accountant'];

// POST /api/auth/register (authenticate + authorize admin)
// Creates a user in the calling admin's school. schoolId in the body is ignored;
// the school comes from the token. No tokens are returned for the new user.
export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    role,
  } = req.body;

  const schoolId = req.user?.schoolId;
  if (!schoolId || !/^\d+$/.test(String(schoolId)) || !/^\d+$/.test(String(req.user?.id ?? ''))) {
    return sendError(res, 'This action requires a school admin account', [], 403);
  }

  // Re-check the caller in the database: active admin of the token's school.
  const caller = await prisma.app_user.findUnique({
    where: { id: BigInt(String(req.user!.id)) },
    select: { status: true, role: true, school_id: true },
  });
  if (
    !caller ||
    caller.status !== 'active' ||
    String(caller.role).toLowerCase() !== 'admin' ||
    caller.school_id !== BigInt(String(schoolId))
  ) {
    return sendError(res, 'This action requires a school admin account', [], 403);
  }

  const assignedRole = role ? String(role).toLowerCase() : 'counselor';
  if (!ASSIGNABLE_ROLES.includes(assignedRole)) {
    return sendError(res, `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`, [], 400);
  }

  const result = await authService.register(
    firstName,
    lastName,
    email,
    phone,
    password,
    assignedRole,
    String(schoolId)
  );

  logger.info('User registered', {
    userId: result.user.id,
    createdBy: req.user!.id,
  });

  sendSuccess(res, 'User registered successfully', { user: result.user }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  logger.info('User logged in', {
    email,
    userId: result.user.id,
  });

  sendSuccess(res, 'Login successful', result, 200);
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'User not authenticated', [], 401);
  }

  const user = await authService.getUserById(userId, req.user!.schoolId);

  sendSuccess(res, 'Profile retrieved successfully', user, 200);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'User not authenticated', [], 401);
  }

  const { firstName, lastName, phone } = req.body;

  const user = await authService.updateUser(userId, req.user!.schoolId, {
    firstName,
    lastName,
    phone,
  });

  logger.info('User profile updated', { userId });

  sendSuccess(res, 'Profile updated successfully', user, 200);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, role, isActive } = req.query;

  const result = await authService.listUsers(
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
    role as string | undefined,
    isActive === 'true',
    req.user!.schoolId
  );

  sendSuccess(res, 'Users retrieved successfully', result.users, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

export const toggleUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await authService.toggleUserStatus(id, req.user!.schoolId);

    logger.info('User status toggled', {
      userId: id,
      status: user.status,
    });

    sendSuccess(res, 'User status updated successfully', user, 200);
  }
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', [], 401);
    }

    const result = await authService.refreshToken(refreshToken);

    sendSuccess(res, 'Token refreshed successfully', result, 200);
  }
);
