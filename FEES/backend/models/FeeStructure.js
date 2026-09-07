import mongoose from 'mongoose';

const feeStructureSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    feeComponents: [{
      feeType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeType',
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    totalFee: {
      type: Number,
      required: true,
      min: 0
    },
    paymentTerms: {
      type: String,
      enum: ['monthly', 'quarterly', 'semester', 'annual'],
      default: 'semester'
    },
    dueDate: {
      type: Date
    },
    gracePeriodDays: {
      type: Number,
      default: 15
    },
    penaltyPerDay: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    academicYear: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model('FeeStructure', feeStructureSchema);
