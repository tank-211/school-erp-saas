import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Razorpay instance
export const razorpayInstance = new Razorpay({
  key_id: process.env.

  
  RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Razorpay configuration
export const razorpayConfig = {
  currency: process.env.RAZORPAY_CURRENCY || 'INR',
  timeout: parseInt(process.env.RAZORPAY_TIMEOUT) || 900, // 15 minutes in seconds
};

export default razorpayInstance;
