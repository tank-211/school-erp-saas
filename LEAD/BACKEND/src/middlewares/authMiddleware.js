import { verifyToken } from "../utils/jwt.js";
import { errorResponse } from "../utils/response.js";
import { getSchoolAccess } from "../utils/schoolAccess.js";

export const authMiddleware = async (req, res, next) => {
  try {


    const token = req.headers.authorization?.split(" ")[1];


    if (!token) {
      return res.status(401).json(errorResponse("No token provided"));
    }



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

    // Tokens stop working once the school is suspended or its subscription
    // expires, not only at the next login.
    if (/^\d+$/.test(String(decoded.schoolId ?? ""))) {
      const access = await getSchoolAccess(decoded.schoolId);
      if (!access.allowed) {
        return res.status(403).json({ ...errorResponse(access.message), code: access.code });
      }
    }

    next();
  } catch (error) {
    res.status(401).json(errorResponse("Authentication failed"));
  }
};