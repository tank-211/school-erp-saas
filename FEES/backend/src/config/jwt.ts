import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  schoolId: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null;
};

export const generateTokenPair = (payload: JwtPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};
