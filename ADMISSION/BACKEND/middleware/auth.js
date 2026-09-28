/**
 * middleware/auth.js
 * JWT Authentication Middleware
 * Verifies JWT token and sets req.user with { id, school_id, role }
 */

import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwtSecret.js';
import * as authQueries from '../db/queries/authQueries.js';

/**
 * authMiddleware
 * Verifies JWT token from request headers and sets req.user
 * Tokens expected in: Authorization: Bearer <token>
 * Or in x-access-token header
 */
export const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header (Bearer token) or x-access-token header
    let token = req.headers['authorization'];
    
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7); // Remove "Bearer " prefix
    } else {
      token = req.headers['x-access-token'];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided. Include token in Authorization or x-access-token header.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());
    
    // Set req.user with decoded token data
    // Expected payload: { id, school_id, role }
    req.user = {
      id: decoded.id ?? decoded.userId,
      school_id: decoded.school_id ?? decoded.schoolId,
      role: decoded.role,
      email: decoded.email,
      ...decoded,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format or signature.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error: ' + error.message,
    });
  }
};

export const isAdmin = (req, res, next) => {
  (async () => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Only school-user tokens can pass. A token without a school (e.g. one issued
    // from the separate super_admin table) must not be matched against app_user by id.
    const tokenSchoolId = parseSchoolId(req.user.school_id);
    if (!tokenSchoolId || !isPositiveIntegerId(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    const freshUser = await authQueries.getUserById(req.user.id);

    if (!freshUser || freshUser.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    // The account must still belong to the school named in the token.
    if (BigInt(freshUser.school_id) !== tokenSchoolId) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    if (freshUser.role !== 'admin' && freshUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    req.user = {
      ...req.user,
      ...freshUser,
    };

    next();
  })().catch((error) => {
    next(error);
  });
};

/**
 * Parse a school id from a token claim. Returns a BigInt, or null when the
 * value is missing or not a positive integer.
 */
export const parseSchoolId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value);
  if (!/^\d+$/.test(text)) return null;
  const id = BigInt(text);
  return id > 0n ? id : null;
};

export const isPositiveIntegerId = (value) =>
  value !== undefined && value !== null && /^\d+$/.test(String(value)) && BigInt(String(value)) > 0n;

/**
 * requireSchool
 * Use after authMiddleware on routes that operate on school-owned data.
 * Rejects tokens that carry no school (for example super-admin tokens) and
 * exposes the caller's school as req.schoolId (BigInt). Handlers must scope
 * every query with req.schoolId and never read a school id from the request.
 */
export const requireSchool = (req, res, next) => {
  const schoolId = parseSchoolId(req.user?.school_id);
  if (!schoolId) {
    return res.status(403).json({
      success: false,
      message: 'This action requires a school user account.',
    });
  }
  req.schoolId = schoolId;
  next();
};

export default authMiddleware;
