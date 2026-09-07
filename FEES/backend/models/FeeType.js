import mongoose from 'mongoose';

const feeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Fee type name is required'],
      enum: ['tuition', 'lab', 'library', 'sports', 'transport', 'examination', 'hostel', 'other']
    },
    description: {
      type: String
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be greater than 0']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('FeeType', feeTypeSchema);
