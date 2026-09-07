import Joi from 'joi';
import logger from '../config/logger.js';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn(`Validation error: ${JSON.stringify(messages)}`);

      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }

    req.validatedData = value;
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Query Validation Error',
        errors: messages
      });
    }

    req.validatedQuery = value;
    next();
  };
};
