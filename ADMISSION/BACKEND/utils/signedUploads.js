/**
 * utils/signedUploads.js
 *
 * Uploaded files (Aadhaar cards, birth certificates, photos) used to be served
 * publicly at /uploads/<name>. They are now served only through short-lived
 * signed URLs:
 *
 *   /uploads/<name>?exp=<unix seconds>&sig=<HMAC-SHA256>
 *
 * - signUploadUrlsInResponse (app-level) signs every `file_url` / `url` value
 *   that points at /uploads/ in JSON responses. Only authenticated, school-scoped
 *   endpoints return document records, so a signed link is only ever handed to
 *   a user who could already see that record.
 * - verifySignedUpload guards the static /uploads mount and rejects unsigned,
 *   tampered or expired links.
 * - stripUploadSignature removes the query string so a signed URL sent back by
 *   the UI is never stored in the database.
 */
import crypto from 'crypto';

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

const getSecret = () => {
  const secret = process.env.UPLOAD_URL_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('UPLOAD_URL_SECRET or JWT_SECRET must be set to sign upload URLs');
  }
  return secret;
};

const signature = (pathname, exp) =>
  crypto.createHmac('sha256', getSecret()).update(`${pathname}:${exp}`).digest('base64url');

export const stripUploadSignature = (value) =>
  typeof value === 'string' ? value.split('?')[0] : value;

export const signUploadUrl = (value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const pathname = stripUploadSignature(value);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${pathname}?exp=${exp}&sig=${signature(pathname, exp)}`;
};

const isUploadPath = (value) => typeof value === 'string' && value.startsWith('/uploads/');

const SIGNED_KEYS = new Set(['file_url', 'url']);

const isPlainObject = (value) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const signDeep = (value, depth = 0) => {
  if (depth > 12 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => signDeep(item, depth + 1));
  // Leave Date, Prisma Decimal, Buffer etc. untouched so their toJSON still applies
  if (!isPlainObject(value)) return value;

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (SIGNED_KEYS.has(key) && isUploadPath(item)) {
      out[key] = signUploadUrl(item);
    } else {
      out[key] = signDeep(item, depth + 1);
    }
  }
  return out;
};

/** App-level middleware: sign upload links in every JSON response. */
export const signUploadUrlsInResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      return originalJson(signDeep(body));
    } catch (error) {
      console.error('Failed to sign upload URLs:', error.message);
      return originalJson(body);
    }
  };
  next();
};

/** Guard for app.use('/uploads', verifySignedUpload, express.static(...)). */
export const verifySignedUpload = (req, res, next) => {
  const pathname = `/uploads${req.path}`;
  const exp = Number(req.query?.exp);
  const sig = String(req.query?.sig || '');

  const denied = () =>
    res.status(403).json({ success: false, message: 'This file link is missing, invalid or expired.' });

  if (!Number.isInteger(exp) || !sig || exp < Math.floor(Date.now() / 1000)) {
    return denied();
  }

  let expected;
  try {
    expected = signature(pathname, exp);
  } catch (error) {
    return denied();
  }

  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return denied();
  }

  next();
};
