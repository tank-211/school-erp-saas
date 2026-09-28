import jwt from "jsonwebtoken";


// ✅ SINGLE SOURCE OF TRUTH
// Read at call time (after dotenv has loaded). No fallback value: a hard-coded
// fallback would let anyone who reads the source mint valid tokens.
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured on the server");
  }
  return secret;
};
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";

// ✅ USE SAME SECRET EVERYWHERE
export const generateToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRE,
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
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