/**
 * utils/schoolMessenger.js — sends email, SMS and WhatsApp as a school,
 * through the school's own accounts that the platform team set up in
 * Super Admin (Schools → Communication; table school_communication_settings).
 *
 * The same file is in LEAD/BACKEND/src/utils and ADMISSION/BACKEND/utils;
 * keep the copies in step (only the prisma import path differs). The
 * provider calls are in ./messageProviders.js.
 *
 * - A school without a working account for a channel gets a clear
 *   "not set up" error (409), never another school's or a shared account.
 * - Secrets are decrypted with PAYMENT_KEYS_SECRET (same value as on the
 *   Super Admin backend, which encrypts them).
 * - Email SMTP (paid hosting only) connects over IPv4: Render has no IPv6
 *   route, which gave "connect ENETUNREACH 2404:…".
 */
import crypto from 'node:crypto';
import dns from 'node:dns';
import { readFile } from 'node:fs/promises';
import prisma from '../src/lib/prisma.js';
import { sendEmailApi, sendSmsApi, sendWhatsAppApi, normalizePhone, API_PROVIDERS, SMS_PROVIDERS, WHATSAPP_PROVIDERS } from './messageProviders.js';

const LABEL = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };

export class ChannelNotSetUpError extends Error {
  constructor(channel = 'email', message) {
    super(message || `${LABEL[channel] || 'Messaging'} is not set up for this school yet. Ask the platform team to set it up in Super Admin → Schools → Communication.`);
    this.name = 'ChannelNotSetUpError';
    this.channel = channel;
    this.status = 409;
    this.statusCode = 409;
    this.code = `${String(channel).toUpperCase()}_NOT_SET_UP`;
  }
}

/** Kept for the email callers: new EmailNotSetUpError() / instanceof checks */
export class EmailNotSetUpError extends ChannelNotSetUpError {
  constructor(message) {
    super('email', message);
    this.name = 'EmailNotSetUpError';
  }
}

const notSetUp = (channel, message) => (channel === 'email' ? new EmailNotSetUpError(message) : new ChannelNotSetUpError(channel, message));

const decryptSecret = (channel, boxed) => {
  const secret = process.env.PAYMENT_KEYS_SECRET || '';
  if (secret.length < 32) {
    throw notSetUp(channel, `The school's ${LABEL[channel]} account cannot be read on this server (PAYMENT_KEYS_SECRET is not set).`);
  }
  const [v, iv, tag, data] = String(boxed || '').split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw notSetUp(channel, `The saved ${LABEL[channel]} key cannot be read. Save it again in Super Admin.`);
  const key = crypto.createHash('sha256').update(secret).digest();
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw notSetUp(channel, `The saved ${LABEL[channel]} key cannot be read on this server (PAYMENT_KEYS_SECRET differs from Super Admin).`);
  }
};

const isMissingTable = (error) => /does not exist|42P01|42703/i.test(`${error?.code} ${error?.message}`);

const loadSettings = async (schoolId) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT * FROM school_communication_settings
      WHERE school_id = ${BigInt(schoolId)}
      LIMIT 1`;
    return rows?.[0] || null;
  } catch (error) {
    // Table not created yet (SUPER-ADMIN/BACKEND/prisma/sql/2026-10-15_school_communication_settings.sql)
    if (isMissingTable(error)) return null;
    throw error;
  }
};

const usable = {
  email: (row) =>
    row.email_status !== 'disconnected' &&
    row.email_from_address &&
    ((API_PROVIDERS.includes(row.email_provider) && row.email_api_key_enc) || (row.email_provider === 'smtp' && row.smtp_host && row.smtp_pass_enc)),
  sms: (row) => row.sms_status !== 'disconnected' && SMS_PROVIDERS.includes(row.sms_provider) && Boolean(row.sms_api_key_enc),
  whatsapp: (row) => row.whatsapp_status !== 'disconnected' && WHATSAPP_PROVIDERS.includes(row.whatsapp_provider) && Boolean(row.whatsapp_token_enc),
};

/** { email, sms, whatsapp } each { enabled, provider, status } (no secrets). */
export const schoolChannelStatus = async (schoolId) => {
  const row = /^\d+$/.test(String(schoolId ?? '')) ? await loadSettings(schoolId) : null;
  const one = (channel) => ({
    enabled: Boolean(row && row[`${channel}_provider`] && usable[channel](row)),
    provider: row?.[`${channel}_provider`] || null,
    status: row?.[`${channel}_status`] || 'not_configured',
  });
  return { email: one('email'), sms: one('sms'), whatsapp: one('whatsapp') };
};

/** Whether the school can send email (no secrets returned). */
export const schoolEmailStatus = async (schoolId) => (await schoolChannelStatus(schoolId)).email;

const settingsFor = async (channel, schoolId) => {
  if (schoolId === null || schoolId === undefined || !/^\d+$/.test(String(schoolId))) {
    throw notSetUp(channel, `No school is linked to this ${LABEL[channel]} message, so it cannot be sent.`);
  }
  const row = await loadSettings(schoolId);
  if (!row || !row[`${channel}_provider`] || !usable[channel](row)) throw notSetUp(channel);
  return row;
};

/* ---------- email ---------- */

// Attachments as { filename, path } (files saved by the upload) -> base64
const readAttachments = async (attachments = []) => {
  const files = [];
  for (const a of attachments) {
    if (!a?.path && a?.content == null) continue;
    const content = a.content != null ? Buffer.from(a.content) : await readFile(a.path);
    files.push({ filename: a.filename || 'attachment', base64: content.toString('base64'), contentType: a.contentType });
  }
  return files;
};

const sendWithSmtp = async (row, mail) => {
  // Connect over IPv4: Render has no IPv6 route to the mail server
  let address = row.smtp_host;
  try {
    ({ address } = await dns.promises.lookup(row.smtp_host, { family: 4 }));
  } catch {
    throw new Error(`The SMTP server ${row.smtp_host} could not be found.`);
  }
  const { default: nodemailer } = await import('nodemailer');
  const port = Number(row.smtp_port) || 587;
  const transporter = nodemailer.createTransport({
    host: address,
    port,
    secure: row.smtp_secure === true || port === 465,
    requireTLS: port === 587,
    auth: { user: row.smtp_user, pass: decryptSecret('email', row.smtp_pass_enc) },
    tls: { servername: row.smtp_host },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  try {
    const info = await transporter.sendMail({
      from: mail.fromName ? `"${mail.fromName.replace(/"/g, '')}" <${mail.fromAddress}>` : mail.fromAddress,
      to: mail.to.join(', '),
      replyTo: mail.replyTo || undefined,
      subject: mail.subject,
      text: mail.text || undefined,
      html: mail.html || undefined,
      attachments: mail.files.map((f) => ({ filename: f.filename, content: Buffer.from(f.base64, 'base64'), contentType: f.contentType })),
    });
    return { messageId: info?.messageId || null, provider: 'smtp' };
  } catch (error) {
    const blocked = /ETIMEDOUT|ENETUNREACH|ECONNREFUSED|ESOCKET|timeout/i.test(`${error?.code} ${error?.message}`);
    throw new Error(
      blocked
        ? `Could not connect to the SMTP server ${row.smtp_host}:${port}. Hosting on Render's free plan blocks SMTP; use Brevo or Resend for this school instead.`
        : `The SMTP server refused the email: ${error.message}`
    );
  }
};

/**
 * Sends one email (to one or more addresses) as the school.
 * mail: { to, subject, text?, html?, replyTo?, attachments?: [{ filename, path | content, contentType }] }
 * Returns { messageId, provider }. Throws EmailNotSetUpError when the school
 * has no usable account, or an Error with the service's reason.
 */
export const sendSchoolEmail = async (schoolId, mail) => {
  const row = await settingsFor('email', schoolId);
  const to = (Array.isArray(mail.to) ? mail.to : String(mail.to || '').split(','))
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  if (!to.length) throw new Error('The email has no recipient address.');

  const prepared = {
    to,
    subject: String(mail.subject || '').slice(0, 300),
    text: mail.text || '',
    html: mail.html || '',
    fromName: row.email_from_name,
    fromAddress: row.email_from_address,
    replyTo: mail.replyTo || row.email_reply_to || null,
    files: await readAttachments(mail.attachments),
  };

  if (row.email_provider === 'smtp') return sendWithSmtp(row, prepared);
  return sendEmailApi({ provider: row.email_provider, apiKey: decryptSecret('email', row.email_api_key_enc), ...prepared });
};

/* ---------- SMS and WhatsApp ---------- */

const checkPhone = (to) => {
  if (!normalizePhone(to)) {
    const error = new Error(`"${String(to || '').slice(0, 30)}" is not a valid mobile number.`);
    error.statusCode = 400;
    throw error;
  }
};

/** Sends one SMS as the school. Returns { messageId, provider }. */
export const sendSchoolSms = async (schoolId, { to, text }) => {
  const row = await settingsFor('sms', schoolId);
  checkPhone(to);
  if (!String(text || '').trim()) throw Object.assign(new Error('The SMS has no text.'), { statusCode: 400 });
  return sendSmsApi({
    provider: row.sms_provider,
    apiKey: decryptSecret('sms', row.sms_api_key_enc),
    accountSid: row.sms_account_sid,
    sender: row.sms_sender,
    templateId: row.sms_template_id,
    templateVar: row.sms_template_var,
    to,
    text,
  });
};

/** Sends one WhatsApp message as the school. Returns { messageId, provider }. */
export const sendSchoolWhatsApp = async (schoolId, { to, text }) => {
  const row = await settingsFor('whatsapp', schoolId);
  checkPhone(to);
  if (!String(text || '').trim()) throw Object.assign(new Error('The WhatsApp message has no text.'), { statusCode: 400 });
  return sendWhatsAppApi({
    provider: row.whatsapp_provider,
    token: decryptSecret('whatsapp', row.whatsapp_token_enc),
    accountSid: row.whatsapp_account_sid,
    sender: row.whatsapp_sender,
    template: row.whatsapp_template,
    templateLang: row.whatsapp_template_lang,
    to,
    text,
  });
};

/** channel: 'email' | 'sms' | 'whatsapp' */
export const sendSchoolMessage = (schoolId, channel, message) => {
  if (channel === 'sms') return sendSchoolSms(schoolId, message);
  if (channel === 'whatsapp') return sendSchoolWhatsApp(schoolId, message);
  return sendSchoolEmail(schoolId, message);
};
