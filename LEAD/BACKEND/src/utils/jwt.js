import jwt from "jsonwebtoken";


// ✅ SINGLE SOURCE OF TRUTH
const JWT_SECRET = process.env.JWT_SECRET || "your_secret";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";

// ✅ USE SAME SECRET EVERYWHERE
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.log("❌ JWT VERIFY ERROR:", error.message); // ADD THIS
    return null;
  }
};

export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};