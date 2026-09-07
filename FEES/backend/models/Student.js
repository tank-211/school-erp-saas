import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
      trim: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required']
    },
    parentInfo: {
      parentName: String,
      parentEmail: String,
      parentPhone: String,
      relationship: String
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated', 'dropped'],
      default: 'active'
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

studentSchema.index({ studentId: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ 'address.city': 1 });

export default mongoose.model('Student', studentSchema);
