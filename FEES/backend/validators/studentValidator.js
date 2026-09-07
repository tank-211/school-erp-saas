import Joi from 'joi';

export const createStudentSchema = Joi.object({
  studentId: Joi.string()
    .required()
    .messages({
      'any.required': 'Student ID is required'
    }),
  firstName: Joi.string()
    .required()
    .messages({
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .required()
    .messages({
      'any.required': 'Last name is required'
    }),
  email: Joi.string()
    .email(),
  phone: Joi.string(),
  dateOfBirth: Joi.date(),
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    postalCode: Joi.string(),
    country: Joi.string()
  }),
  course: Joi.string()
    .required()
    .messages({
      'any.required': 'Course is required'
    }),
  class: Joi.string()
    .required()
    .messages({
      'any.required': 'Class is required'
    }),
  parentInfo: Joi.object({
    parentName: Joi.string(),
    parentEmail: Joi.string().email(),
    parentPhone: Joi.string(),
    relationship: Joi.string()
  }),
  status: Joi.string().valid('active', 'inactive', 'graduated', 'dropped')
});

export const updateStudentSchema = Joi.object({
  firstName: Joi.string(),
  lastName: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string(),
  dateOfBirth: Joi.date(),
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    postalCode: Joi.string(),
    country: Joi.string()
  }),
  course: Joi.string(),
  class: Joi.string(),
  parentInfo: Joi.object({
    parentName: Joi.string(),
    parentEmail: Joi.string().email(),
    parentPhone: Joi.string(),
    relationship: Joi.string()
  }),
  status: Joi.string().valid('active', 'inactive', 'graduated', 'dropped')
}).min(1);
