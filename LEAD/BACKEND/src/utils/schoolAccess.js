/**
 * src/utils/schoolAccess.js
 *
 * Whether a school may use the product, by the rules SUPER-ADMIN manages:
 * - suspended (is_active = false, or status 'suspended'/'inactive') -> blocked
 * - expiry_date before today (India date)                           -> blocked
 * - no expiry_date                                                  -> allowed
 * Same rule in ADMISSION, FEES and SUPER-ADMIN; keep the copies in step.
 *
 * Checked at login and on every authenticated request (tokens live for
 * hours), with a short cache so each request does not hit the database.
 */
import prisma from '../prisma/index.js';

const CACHE_MS = 60 * 1000;
const cache = new Map(); // schoolId -> { result, at }

const indiaDate = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date); // YYYY-MM-DD

export const evaluateSchoolAccess = (school, now = new Date()) => {
  if (!school) {
    return { allowed: false, code: 'SCHOOL_NOT_FOUND', message: 'Your school account was not found. Please contact support.' };
  }
  const status = String(school.status || '').toLowerCase();
  if (school.is_active === false || status === 'suspended' || status === 'inactive') {
    return { allowed: false, code: 'SCHOOL_SUSPENDED', message: "Your school's access is suspended. Please contact support." };
  }
  if (school.expiry_date) {
    // expiry_date is a DATE column: Prisma returns midnight UTC of that day
    const expiry = new Date(school.expiry_date).toISOString().slice(0, 10);
    if (expiry < indiaDate(now)) {
      return { allowed: false, code: 'SUBSCRIPTION_EXPIRED', message: "Your school's subscription has expired. Please renew to continue." };
    }
  }
  return { allowed: true };
};

export const getSchoolAccess = async (schoolId) => {
  const key = String(schoolId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;

  const school = await prisma.school.findUnique({
    where: { id: BigInt(schoolId) },
    select: { is_active: true, status: true, expiry_date: true },
  });
  const result = evaluateSchoolAccess(school);
  cache.set(key, { result, at: Date.now() });
  return result;
};

export const denySchoolAccess = (res, access) =>
  res.status(403).json({ success: false, code: access.code, message: access.message, error: access.message });

export const clearSchoolAccessCache = () => cache.clear(); // for tests
