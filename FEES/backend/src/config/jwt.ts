import jwt from 'jsonwebtoken';

// Secrets are read at call time and have no fallback value: a hard-coded
// fallback would let anyone who reads the source mint valid tokens.
const requireSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured on the server`);
  }
  return value;
};
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  schoolId: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, requireSecret('JWT_SECRET'), { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, requireSecret('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, requireSecret('JWT_SECRET')) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, requireSecret('JWT_REFRESH_SECRET')) as JwtPayload;
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
