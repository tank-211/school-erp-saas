import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  logger.error(`Error: ${err.message}`, {
    statusCode: err.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors)
      .map(error => error.message)
      .join(', ');
    return res.status(400).json({
      success: false,
      message: `Validation Error: ${messages}`
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  return res.status(err.statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
