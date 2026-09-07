import { verifyAccessToken } from '../config/jwt.js';
import logger from '../config/logger.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is missing'
      });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user: ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};
