import Joi from 'joi';

export const createRefundRequestSchema = Joi.object({
  feePayment: Joi.string()
    .required()
    .messages({
      'any.required': 'Fee payment is required'
    }),
  amount: Joi.number()
    .positive()
    .required()
    .messages({
      'any.required': 'Refund amount is required',
      'number.positive': 'Amount must be positive'
    }),
  reason: Joi.string()
    .valid('withdrawal', 'course_cancellation', 'overpayment', 'scholarship', 'other')
    .required()
    .messages({
      'any.required': 'Reason is required'
    }),
  description: Joi.string(),
  refundMethod: Joi.string()
    .valid('bank_transfer', 'cheque', 'cash')
    .default('bank_transfer'),
  bankDetails: Joi.when('refundMethod', {
    is: 'bank_transfer',
    then: Joi.object({
      accountHolder: Joi.string().required(),
      accountNumber: Joi.string().required(),
      ifscCode: Joi.string().required()
    })
  })
});

export const approveRefundSchema = Joi.object({
  approvedBy: Joi.string().required(),
  notes: Joi.string(),
  status: Joi.string()
    .valid('approved', 'rejected')
    .required()
});

export const refundStatusFilterSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'processed'),
  student: Joi.string(),
  fromDate: Joi.date(),
  toDate: Joi.date(),
  page: Joi.number().positive().default(1),
  limit: Joi.number().positive().default(10)
});
