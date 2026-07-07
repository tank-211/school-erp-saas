/**
 * middleware/auth.js
 * JWT Authentication Middleware
 * Verifies JWT token and sets req.user with { id, school_id, role }
 */

import jwt from 'jsonwebtoken';
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Set req.user with decoded token data
    // Expected payload: { id, school_id, role }
    req.user = {
      id: decoded.id,
      school_id: decoded.school_id,
      role: decoded.role,
      ...decoded, // Include any additional fields from the token
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

    const freshUser = await authQueries.getUserById(req.user.id);

    if (!freshUser || freshUser.status !== 'active') {
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

export default authMiddleware;
