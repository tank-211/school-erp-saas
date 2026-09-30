/**
 * utils/secretBox.js — encrypts school payment secrets at rest.
 * AES-256-GCM with a key derived from the PAYMENT_KEYS_SECRET server setting.
 * The same setting (same value) must be on the FEES backend, which decrypts
 * (FEES/backend/src/utils/secretBox.ts). Format: v1:<iv>:<tag>:<ciphertext>.
 */
const crypto = require('crypto');

const keyFromEnv = () => {
  const secret = process.env.PAYMENT_KEYS_SECRET || '';
  if (secret.length < 32) {
    const e = new Error('PAYMENT_KEYS_SECRET must be set (32+ characters) on the server before payment keys can be saved.');
    e.code = 'PAYMENT_KEYS_SECRET_MISSING';
    throw e;
  }
  return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (plain) => {
  const key = keyFromEnv();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
};

const decrypt = (boxed) => {
  const [v, iv, tag, data] = String(boxed || '').split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Stored secret is not in a readable format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromEnv(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
};

module.exports = { encrypt, decrypt };
