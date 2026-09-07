import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    })
});

export const createUserSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be 10 digits',
      'any.required': 'Phone is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('admin', 'accountant', 'staff')
    .default('staff'),
  department: Joi.string()
    .valid('accounts', 'administration', 'support')
    .default('administration')
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^[0-9]{10}$/),
  role: Joi.string().valid('admin', 'accountant', 'staff'),
  department: Joi.string().valid('accounts', 'administration', 'support'),
  isActive: Joi.boolean()
}).min(1);
