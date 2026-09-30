/**
 * services/schoolRazorpay.ts — each school's own Razorpay account.
 *
 * Super Admin saves a school's API keys (encrypted) in school_payment_gateway
 * and tests them. Online payments only run for a school whose keys passed the
 * test (status "connected"); money goes to that school's Razorpay account.
 * There is no fallback to a platform account.
 */
import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../config/database';
import { decryptSecret } from '../utils/secretBox';

export class PaymentsNotSetUpError extends Error {
  status = 409;
  code = 'ONLINE_PAYMENTS_NOT_SET_UP';
  constructor(message = 'Online payments are not set up for this school yet. Ask the platform team to connect the school\'s Razorpay account.') {
    super(message);
    this.name = 'PaymentsNotSetUpError';
  }
}

export interface SchoolRazorpay {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  mode: string | null;
  client: Razorpay;
}

// One client per key id (keys rarely change; a new key id makes a new client)
const clients = new Map<string, Razorpay>();

const loadRow = async (schoolId: string | bigint) => {
  try {
    return await (prisma as any).school_payment_gateway.findUnique({
      where: { school_id: BigInt(String(schoolId)) },
      select: { status: true, key_id: true, key_secret_enc: true, webhook_secret_enc: true, mode: true },
    });
  } catch {
    // Table or columns not created yet (prisma/sql/2026-09-30_school_razorpay_keys.sql)
    return null;
  }
};

/** Whether the school can take online payments right now (no secrets returned). */
export const schoolPaymentStatus = async (schoolId: string | bigint) => {
  const row = await loadRow(schoolId);
  return {
    enabled: Boolean(row && row.status === 'connected' && row.key_id && row.key_secret_enc),
    mode: row?.mode || null,
    status: row?.status || 'not_connected',
  };
};

/** The school's Razorpay keys and client; throws PaymentsNotSetUpError otherwise. */
export const getSchoolRazorpay = async (schoolId: string | bigint): Promise<SchoolRazorpay> => {
  const row = await loadRow(schoolId);
  if (!row || row.status !== 'connected' || !row.key_id || !row.key_secret_enc) {
    throw new PaymentsNotSetUpError();
  }
  let keySecret: string;
  try {
    keySecret = decryptSecret(row.key_secret_enc);
  } catch {
    throw new PaymentsNotSetUpError('This school\'s Razorpay keys cannot be read on the Fees server (check PAYMENT_KEYS_SECRET).');
  }
  let webhookSecret: string | null = null;
  if (row.webhook_secret_enc) {
    try {
      webhookSecret = decryptSecret(row.webhook_secret_enc);
    } catch {
      webhookSecret = null;
    }
  }
  const cacheKey = `${row.key_id}:${crypto.createHash('sha256').update(keySecret).digest('hex').slice(0, 16)}`;
  let client = clients.get(cacheKey);
  if (!client) {
    client = new Razorpay({ key_id: row.key_id, key_secret: keySecret });
    clients.set(cacheKey, client);
  }
  return { keyId: row.key_id, keySecret, webhookSecret, mode: row.mode, client };
};
