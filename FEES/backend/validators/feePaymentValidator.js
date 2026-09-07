import Joi from 'joi';
import mongoose from 'mongoose';

export const createFeePaymentSchema = Joi.object({
  student: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.required': 'Student is required',
      'any.invalid': 'Invalid student ID'
    }),
  feeStructure: Joi.string()
    .required()
    .messages({
      'any.required': 'Fee structure is required'
    }),
  totalAmount: Joi.number()
    .positive()
    .required()
    .messages({
      'any.required': 'Total amount is required',
      'number.positive': 'Total amount must be positive'
    }),
  dueDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Due date is required'
    })
});

/**
 * Schema for submitting a fee payment from frontend
 * Validates that amountPaid does not exceed totalAmount
 */
export const submitFeePaymentSchema = Joi.object({
  totalAmount: Joi.number()
    .positive()
    .required()
    .messages({
      'any.required': 'Total amount is required',
      'number.positive': 'Total amount must be greater than 0'
    }),
  amountPaid: Joi.number()
    .min(0)
    .max(Joi.ref('totalAmount'))
    .required()
    .messages({
      'any.required': 'Amount paid is required',
      'number.min': 'Amount paid cannot be negative',
      'number.max': 'Amount paid cannot exceed total amount'
    }),
  paymentMethod: Joi.string()
    .valid('cash', 'cheque', 'online', 'bank_transfer', 'credit_card', 'debit_card')
    .required()
    .messages({
      'any.required': 'Payment method is required',
      'any.only': 'Invalid payment method'
    }),
  paymentStatus: Joi.string()
    .valid('pending', 'partial', 'paid', 'overdue', 'cancelled')
    .default('pending')
    .messages({
      'any.only': 'Invalid payment status'
    }),
  student: Joi.string()
    .custom((value, helpers) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Invalid student ID'
    }),
  dueDate: Joi.date()
    .messages({
      'date.base': 'Due date must be a valid date'
    }),
  notes: Joi.string().allow('').messages({
      'string.base': 'Notes must be a string'
    })
}).external(async (value) => {
  // External validation: ensure amountPaid is not greater than totalAmount
  if (value.amountPaid > value.totalAmount) {
    throw new Error('Amount paid cannot exceed total amount');
  }
});

export const recordPaymentSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .required()
    .messages({
      'any.required': 'Amount is required',
      'number.positive': 'Amount must be positive'
    }),
  paymentMethod: Joi.string()
    .valid('cash', 'cheque', 'online', 'bank_transfer')
    .required()
    .messages({
      'any.required': 'Payment method is required'
    }),
  transactionId: Joi.string(),
  notes: Joi.string()
});

export const searchFeePaymentSchema = Joi.object({
  student: Joi.string(),
  paymentStatus: Joi.string().valid('pending', 'partial', 'paid', 'overdue', 'cancelled'),
  fromDate: Joi.date(),
  toDate: Joi.date(),
  page: Joi.number().positive().default(1),
  limit: Joi.number().positive().default(10)
});
