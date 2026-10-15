/**
 * utils/schoolMailer.js — sends email as a school, through the school's own
 * email account that the platform team set up in Super Admin
 * (Schools → Communication; table school_communication_settings).
 *
 * The same file is in LEAD/BACKEND/src/utils and ADMISSION/BACKEND/utils;
 * keep the copies in step (only the prisma import path differs).
 *
 * - Brevo and Resend are sent through their web APIs. Render's free plan
 *   blocks the SMTP ports (465/587), so these are the ones that work there.
 * - SMTP is supported for paid hosting; it connects over IPv4 (Render has no
 *   IPv6 route, which gave "connect ENETUNREACH 2404:…").
 * - A school without a working account gets a clear error, never another
 *   school's or the platform's mailbox.
 * - Secrets are decrypted with PAYMENT_KEYS_SECRET (same value as on the
 *   Super Admin backend, which encrypts them).
 */
import crypto from 'node:crypto';
import dns from 'node:dns';
import { readFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';
import prisma from '../src/lib/prisma.js';

export class EmailNotSetUpError extends Error {
  constructor(message = "Email is not set up for this school yet. Ask the platform team to set it up in Super Admin → Schools → Communication.") {
    super(message);
    this.name = 'EmailNotSetUpError';
    this.status = 409;
    this.statusCode = 409;
    this.code = 'EMAIL_NOT_SET_UP';
  }
}

const decryptSecret = (boxed) => {
  const secret = process.env.PAYMENT_KEYS_SECRET || '';
  if (secret.length < 32) {
    throw new EmailNotSetUpError('The school email account cannot be read on this server (PAYMENT_KEYS_SECRET is not set).');
  }
  const [v, iv, tag, data] = String(boxed || '').split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new EmailNotSetUpError('The saved email password or key cannot be read. Save it again in Super Admin.');
  const key = crypto.createHash('sha256').update(secret).digest();
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new EmailNotSetUpError('The saved email password or key cannot be read on this server (PAYMENT_KEYS_SECRET differs from Super Admin).');
  }
};

const loadSettings = async (schoolId) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT email_provider, email_from_name, email_from_address, email_reply_to,
             email_api_key_enc, smtp_host, smtp_port, smtp_secure, smtp_user,
             smtp_pass_enc, email_status
      FROM school_communication_settings
      WHERE school_id = ${BigInt(schoolId)}
      LIMIT 1`;
    return rows?.[0] || null;
  } catch (error) {
    // Table not created yet (SUPER-ADMIN/BACKEND/prisma/sql/2026-10-15_school_communication_settings.sql)
    if (/does not exist|42P01/i.test(`${error?.code} ${error?.message}`)) return null;
    throw error;
  }
};

const API = {
  brevo: {
    label: 'Brevo',
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: (apiKey) => ({ 'api-key': apiKey }),
    body: (m) => ({
      sender: { name: m.fromName || m.fromAddress, email: m.fromAddress },
      to: m.to.map((email) => ({ email })),
      subject: m.subject,
      ...(m.text ? { textContent: m.text } : {}),
      ...(m.html ? { htmlContent: m.html } : {}),
      ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}),
      ...(m.files.length ? { attachment: m.files.map((f) => ({ name: f.filename, content: f.base64 })) } : {}),
    }),
    messageId: (json) => json?.messageId || null,
  },
  resend: {
    label: 'Resend',
    url: 'https://api.resend.com/emails',
    headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    body: (m) => ({
      from: m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress,
      to: m.to,
      subject: m.subject,
      ...(m.text ? { text: m.text } : {}),
      ...(m.html ? { html: m.html } : {}),
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      ...(m.files.length ? { attachments: m.files.map((f) => ({ filename: f.filename, content: f.base64 })) } : {}),
    }),
    messageId: (json) => json?.id || null,
  },
};

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

const sendWithApi = async (provider, apiKey, mail) => {
  const p = API[provider];
  let response;
  try {
    response = await fetch(p.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...p.headers(apiKey) },
      body: JSON.stringify(p.body(mail)),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error(`Could not reach ${p.label}. Try again in a minute.`);
  }
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok) {
    const reason = json?.message || json?.error?.message || json?.error || json?.name || `status ${response.status}`;
    throw new Error(`${p.label} did not send the email: ${reason}`);
  }
  return { messageId: p.messageId(json), provider };
};

const sendWithSmtp = async (row, mail) => {
  // Connect over IPv4: Render has no IPv6 route to the mail server
  let address = row.smtp_host;
  try {
    ({ address } = await dns.promises.lookup(row.smtp_host, { family: 4 }));
  } catch {
    throw new Error(`The SMTP server ${row.smtp_host} could not be found.`);
  }
  const port = Number(row.smtp_port) || 587;
  const transporter = nodemailer.createTransport({
    host: address,
    port,
    secure: row.smtp_secure === true || port === 465,
    requireTLS: port === 587,
    auth: { user: row.smtp_user, pass: decryptSecret(row.smtp_pass_enc) },
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

/** Whether the school can send email (no secrets returned). */
export const schoolEmailStatus = async (schoolId) => {
  const row = await loadSettings(schoolId);
  return { enabled: Boolean(row && isUsable(row)), provider: row?.email_provider || null, status: row?.email_status || 'not_configured' };
};

const isUsable = (row) =>
  row.email_status !== 'disconnected' &&
  row.email_from_address &&
  ((row.email_provider in API && row.email_api_key_enc) || (row.email_provider === 'smtp' && row.smtp_host && row.smtp_pass_enc));

/**
 * Sends one email (to one or more addresses) as the school.
 * mail: { to, subject, text?, html?, replyTo?, attachments?: [{ filename, path | content, contentType }] }
 * Returns { messageId, provider }. Throws EmailNotSetUpError when the school
 * has no usable account, or an Error with the service's reason.
 */
export const sendSchoolEmail = async (schoolId, mail) => {
  if (schoolId === null || schoolId === undefined || !/^\d+$/.test(String(schoolId))) {
    throw new EmailNotSetUpError('No school is linked to this email, so it cannot be sent.');
  }
  const row = await loadSettings(schoolId);
  if (!row || !isUsable(row)) throw new EmailNotSetUpError();

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
  return sendWithApi(row.email_provider, decryptSecret(row.email_api_key_enc), prepared);
};
