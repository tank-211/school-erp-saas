/**
 * utils/jwtSecret.js
 * Returns JWT_SECRET, read at call time (after dotenv has loaded).
 * There is deliberately no fallback value: a hard-coded fallback would let
 * anyone who reads the source code mint valid tokens if the env var is unset.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server');
  }
  return secret;
};
