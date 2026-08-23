import { verifyToken } from "../utils/jwt.js";
import { errorResponse } from "../utils/response.js";

export const authMiddleware = async (req, res, next) => {
  try {

    console.log("Authorization:", req.headers.authorization);

    const token = req.headers.authorization?.split(" ")[1];

    console.log("Extracted Token:", token);
    console.log("Token Type:", typeof token);

    if (!token) {
      return res.status(401).json(errorResponse("No token provided"));
    }


    console.log("Authorization Header:", req.headers.authorization);
    console.log("Extracted Token:", token);
    console.log("Token Type:", typeof token);

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json(errorResponse("Invalid or expired token"));
    }

    // 🔥 attach user
    req.user = {
      id: decoded.userId,
      schoolId: decoded.schoolId,
      role: decoded.role 
    };

    // 🔥 LOG AFTER SETTING
    console.log("DECODED TOKEN:", decoded);
    console.log("REQ.USER:", req.user);

    next();
  } catch (error) {
    res.status(401).json(errorResponse("Authentication failed"));
  }
};