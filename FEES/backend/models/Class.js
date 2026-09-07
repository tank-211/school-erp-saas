import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required']
    },
    code: {
      type: String,
      required: [true, 'Class code is required'],
      uppercase: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required']
    },
    capacity: {
      type: Number,
      default: 50
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Class', classSchema);
