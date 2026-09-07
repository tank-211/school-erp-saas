import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      unique: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'accountant', 'staff'],
      default: 'staff'
    },
    department: {
      type: String,
      enum: ['accounts', 'administration', 'support'],
      default: 'administration'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now,
        expires: 2592000 // 30 days
      }
    }]
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

export default mongoose.model('User', userSchema);
