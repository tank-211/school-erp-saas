/**
 * utils/secretBox.ts — reads school payment secrets encrypted by Super Admin
 * (SUPER-ADMIN/BACKEND/utils/secretBox.js). AES-256-GCM with a key derived
 * from PAYMENT_KEYS_SECRET, which must have the same value on both servers.
 */
import crypto from 'crypto';

const keyFromEnv = (): Buffer => {
  const secret = process.env.PAYMENT_KEYS_SECRET || '';
  if (secret.length < 32) {
    throw new Error('PAYMENT_KEYS_SECRET is not set on the Fees server');
  }
  return crypto.createHash('sha256').update(secret).digest();
};

export const decryptSecret = (boxed: string | null | undefined): string => {
  const [v, iv, tag, data] = String(boxed || '').split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Stored secret is not in a readable format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromEnv(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
};

// For tests only (Super Admin encrypts in production)
export const encryptSecret = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromEnv(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
};
