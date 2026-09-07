import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, decodeToken } from '../config/jwt';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import logger from '../config/logger';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };

    logger.debug('User authenticated', { userId: decoded.id, email: decoded.email });
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token has expired'));
    } else if (err.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
    } else if (err instanceof AuthenticationError) {
      next(err);
    } else {
      next(new AuthenticationError(err.message || 'Authentication failed'));
    }
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path,
        });

        throw new AuthorizationError(
          `This action requires one of these roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Optional authentication - doesn't throw error if no token
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = decodeToken(token);
      if (decoded) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        schoolId: decoded.schoolId,
      };
      }
    }
  } catch (err) {
    logger.debug('Optional authentication failed but continuing');
  }

  next();
};
