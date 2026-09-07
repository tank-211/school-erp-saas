import mongoose from 'mongoose';

const feePaymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required']
    },
    feeStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: [true, 'Fee structure is required']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: 0
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    amountPending: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    },
    payments: [{
      amount: Number,
      paymentDate: {
        type: Date,
        default: Date.now
      },
      paymentMethod: {
        type: String,
        enum: ['cash', 'cheque', 'online', 'bank_transfer'],
        required: true
      },
      transactionId: String,
      receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String
    }],
    penaltyCharges: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountReason: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

feePaymentSchema.index({ student: 1 });
feePaymentSchema.index({ paymentStatus: 1 });
feePaymentSchema.index({ dueDate: 1 });

export default mongoose.model('FeePayment', feePaymentSchema);
