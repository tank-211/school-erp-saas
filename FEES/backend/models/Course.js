import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true
    },
    description: {
      type: String
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['months', 'years'],
        default: 'years'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
