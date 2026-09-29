/**
 * utils/schoolAccess.ts
 *
 * Whether a school may use the product, by the rules SUPER-ADMIN manages:
 * - suspended (is_active = false, or status 'suspended'/'inactive') -> blocked
 * - expiry_date before today (India date)                           -> blocked
 * - no expiry_date                                                  -> allowed
 * Same rule in ADMISSION, LEAD and SUPER-ADMIN; keep the copies in step.
 *
 * Checked at login and on every authenticated request (tokens live for
 * hours), with a short cache so each request does not hit the database.
 */
import prisma from '../config/database';
import { AuthorizationError } from '../middleware/errorHandler';

const CACHE_MS = 60 * 1000;

export interface SchoolAccess {
  allowed: boolean;
  code?: 'SCHOOL_NOT_FOUND' | 'SCHOOL_SUSPENDED' | 'SUBSCRIPTION_EXPIRED';
  message?: string;
}

const cache = new Map<string, { result: SchoolAccess; at: number }>();

const indiaDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date); // YYYY-MM-DD

export const evaluateSchoolAccess = (
  school: { is_active: boolean | null; status: string | null; expiry_date: Date | null } | null,
  now: Date = new Date()
): SchoolAccess => {
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

export const getSchoolAccess = async (schoolId: string | number | bigint): Promise<SchoolAccess> => {
  const key = String(schoolId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;

  const school = await prisma.school.findUnique({
    where: { id: BigInt(key) },
    select: { is_active: true, status: true, expiry_date: true },
  });
  const result = evaluateSchoolAccess(school);
  cache.set(key, { result, at: Date.now() });
  return result;
};

/** 403 error carrying SCHOOL_SUSPENDED / SUBSCRIPTION_EXPIRED as its code. */
export class SchoolAccessError extends AuthorizationError {
  constructor(access: SchoolAccess) {
    super(access.message || 'School access denied');
    this.code = access.code || 'SCHOOL_ACCESS_DENIED';
    this.name = 'SchoolAccessError';
  }
}

export const clearSchoolAccessCache = () => cache.clear();
