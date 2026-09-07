import { Request, Response, NextFunction } from 'express';
import { validationResult, body, query, param, FieldValidationError, ValidationError as ExpressValidationError } from 'express-validator';
import { ValidationError } from './errorHandler';

export const validateRequest = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((err: ExpressValidationError) => {
        // Handle field validation errors
        if (err.type === 'field') {
          const fieldErr = err as FieldValidationError;
          return {
            field: fieldErr.path,
            message: fieldErr.msg,
            value: fieldErr.value,
          };
        }
        
        // Handle alternative validation errors
        if (err.type === 'alternative' || err.type === 'alternative_grouped') {
          const nestedPath = (err as any).nestedErrors?.[0]?.path || (err as any).nestedErrors?.[0]?.param || 'unknown';
          return {
            field: nestedPath,
            message: err.msg || 'Alternative validation failed',
            value: undefined,
          };
        }
        
        // Fallback for unknown error types
        return {
          field: 'unknown',
          message: 'An unexpected validation error occurred',
          value: undefined,
        };
      });

      const errorMessages = formattedErrors.map((e) => e.message).join(', ');
      throw new ValidationError(`Validation failed: ${errorMessages}`);
    }
    next();
  };
};

// Common validators
export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const registerValidator = [
  body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Phone must be 10 digits'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and numbers'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
];

export const createStudentValidator = [
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('courseId').isUUID().withMessage('Valid course ID is required'),
  body('classId').isUUID().withMessage('Valid class ID is required'),
  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone must be 10 digits'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('city').optional().trim(),
  body('state').optional().trim(),
];

export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const uuidValidator = (paramName: string) => [
  param(paramName).isUUID().withMessage(`Invalid ${paramName} format`),
];
