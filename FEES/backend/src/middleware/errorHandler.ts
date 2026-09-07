import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        schoolId: string;
      };
    }
  }
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

// Global error handler middleware
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  logger.error(`Error [${status}]: ${message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    error: err.stack,
  });

  res.status(status).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

// Async error wrapper
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Error classes
export class ValidationError extends Error implements ApiError {
  status = 400;
  code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements ApiError {
  status = 401;
  code = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements ApiError {
  status = 403;
  code = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  status = 404;
  code = 'NOT_FOUND';

  constructor(message: string = 'Not Found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  status = 409;
  code = 'CONFLICT';

  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}
