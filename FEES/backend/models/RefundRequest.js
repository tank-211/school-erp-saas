import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required']
    },
    feePayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeePayment',
      required: [true, 'Fee payment is required']
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Amount must be greater than 0']
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      enum: ['withdrawal', 'course_cancellation', 'overpayment', 'scholarship', 'other']
    },
    description: String,
    requestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processed'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalDate: Date,
    rejectionReason: String,
    refundMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash'],
      default: 'bank_transfer'
    },
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      ifscCode: String
    },
    processedDate: Date,
    refundTransactionId: String,
    notes: String
  },
  { timestamps: true }
);

refundRequestSchema.index({ student: 1 });
refundRequestSchema.index({ status: 1 });
refundRequestSchema.index({ requestDate: 1 });

export default mongoose.model('RefundRequest', refundRequestSchema);
