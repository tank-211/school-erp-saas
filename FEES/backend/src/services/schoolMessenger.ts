/**
 * services/schoolMessenger.ts — sends SMS and WhatsApp as a school, through
 * the school's own accounts that the platform team set up in Super Admin
 * (Schools → Communication; table school_communication_settings).
 *
 * Same rules as LEAD/ADMISSION utils/schoolMessenger.js and
 * messageProviders.js; keep them in step.
 * - A school without a working account for the channel gets a clear 409;
 *   no other school's or shared account is ever used.
 * - Secrets are decrypted with PAYMENT_KEYS_SECRET (same value as Super Admin).
 */
import prisma from '../config/database';
import { decryptSecret } from '../utils/secretBox';

export type PhoneChannel = 'sms' | 'whatsapp';
const LABEL: Record<PhoneChannel, string> = { sms: 'SMS', whatsapp: 'WhatsApp' };

export class ChannelNotSetUpError extends Error {
  status = 409;
  code: string;
  channel: PhoneChannel;
  constructor(channel: PhoneChannel, message?: string) {
    super(message || `${LABEL[channel]} is not set up for this school yet. Ask the platform team to set it up in Super Admin → Schools → Communication.`);
    this.name = 'ChannelNotSetUpError';
    this.channel = channel;
    this.code = `${channel.toUpperCase()}_NOT_SET_UP`;
  }
}

/** The provider refused or could not be reached; message has its reason. */
export class ProviderError extends Error {
  status = 502;
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

const TIMEOUT_MS = 20000;

const post = async (label: string, url: string, init: { headers: Record<string, string>; body: string }) => {
  let response: any;
  try {
    response = await (globalThis as any).fetch(url, { method: 'POST', ...init, signal: (AbortSignal as any).timeout(TIMEOUT_MS) });
  } catch {
    throw new ProviderError(`Could not reach ${label}. Try again in a minute.`);
  }
  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { ok: Boolean(response.ok), status: Number(response.status), json };
};

const reason = (json: any, status: number): string => {
  if (!json) return `the service answered with status ${status}`;
  const err = json.error;
  return (
    (err && typeof err === 'object' && (err.error_user_msg || err.message)) ||
    (typeof err === 'string' && err) ||
    json.message ||
    `the service answered with status ${status}`
  );
};

/** Digits with country code, e.g. 919876543210; numbers without one are Indian. */
export const normalizePhone = (value: unknown): string | null => {
  const raw = String(value ?? '').trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (raw.startsWith('+') || raw.startsWith('00')) {
    if (raw.startsWith('00')) digits = digits.slice(2);
  } else if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
};

const templateValue = (text: string) => String(text || '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, 1000);

const twilioFrom = (sender: string | null, prefix = ''): Record<string, string> => {
  const value = String(sender || '').trim();
  if (/^MG[0-9a-zA-Z]{32}$/.test(value)) return { MessagingServiceSid: value };
  const phone = normalizePhone(value);
  if (!phone) throw new ProviderError('The Twilio sender saved for this school is not valid. Check it in Super Admin.');
  return { From: `${prefix}+${phone}` };
};

const twilioSend = async (label: string, accountSid: string, authToken: string, form: Record<string, string>) => {
  const { ok, status, json } = await post(label, `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(form).toString(),
  });
  if (!ok) throw new ProviderError(`${label}: ${reason(json, status)}`);
  return (json && json.sid) || null;
};

const isMissingTable = (error: any) => /does not exist|42P01|42703/i.test(`${error?.code} ${error?.message}`);

const loadSettings = async (schoolId: string | bigint): Promise<any | null> => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM school_communication_settings
      WHERE school_id = ${BigInt(String(schoolId))}
      LIMIT 1`;
    return rows?.[0] || null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
};

const usable = (row: any, channel: PhoneChannel) =>
  channel === 'sms'
    ? row.sms_status !== 'disconnected' && ['msg91', 'twilio'].includes(row.sms_provider) && Boolean(row.sms_api_key_enc)
    : row.whatsapp_status !== 'disconnected' && ['meta', 'twilio'].includes(row.whatsapp_provider) && Boolean(row.whatsapp_token_enc);

const secret = (channel: PhoneChannel, boxed: string) => {
  try {
    return decryptSecret(boxed);
  } catch {
    throw new ChannelNotSetUpError(channel, `The saved ${LABEL[channel]} key cannot be read on the Fees server (check PAYMENT_KEYS_SECRET, or save the key again in Super Admin).`);
  }
};

/** Whether the school can send on this channel (no secrets). */
export const schoolChannelEnabled = async (schoolId: string | bigint, channel: PhoneChannel) => {
  if (!/^\d+$/.test(String(schoolId ?? ''))) return false;
  const row = await loadSettings(schoolId);
  return Boolean(row && usable(row, channel));
};

/** Sends one SMS or WhatsApp message as the school. Returns { messageId, provider }. */
export const sendSchoolMessage = async (schoolId: string | bigint, channel: PhoneChannel, to: string, text: string) => {
  if (!/^\d+$/.test(String(schoolId ?? ''))) throw new ChannelNotSetUpError(channel, 'No school is linked to this message.');
  const row = await loadSettings(schoolId);
  if (!row || !usable(row, channel)) throw new ChannelNotSetUpError(channel);
  const phone = normalizePhone(to);
  if (!phone) throw new ProviderError(`"${String(to || '').slice(0, 30)}" is not a valid mobile number.`);

  if (channel === 'sms') {
    const key = secret('sms', row.sms_api_key_enc);
    if (row.sms_provider === 'msg91') {
      const { ok, status, json } = await post('MSG91', 'https://control.msg91.com/api/v5/flow', {
        headers: { authkey: key, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          template_id: row.sms_template_id,
          short_url: '0',
          ...(row.sms_sender ? { sender: row.sms_sender } : {}),
          recipients: [{ mobiles: phone, [row.sms_template_var || 'var1']: String(text).trim() }],
        }),
      });
      if (!ok || (json && json.type && json.type !== 'success')) throw new ProviderError(`MSG91: ${reason(json, status)}`);
      return { messageId: (json && (json.request_id || json.message)) || null, provider: 'msg91' };
    }
    const messageId = await twilioSend('Twilio', row.sms_account_sid, key, {
      To: `+${phone}`,
      Body: String(text).slice(0, 1600),
      ...twilioFrom(row.sms_sender),
    });
    return { messageId, provider: 'twilio' };
  }

  const token = secret('whatsapp', row.whatsapp_token_enc);
  if (row.whatsapp_provider === 'meta') {
    const message = row.whatsapp_template
      ? {
          type: 'template',
          template: {
            name: row.whatsapp_template,
            language: { code: row.whatsapp_template_lang || 'en' },
            components: [{ type: 'body', parameters: [{ type: 'text', text: templateValue(text) }] }],
          },
        }
      : { type: 'text', text: { preview_url: false, body: String(text).slice(0, 4096) } };
    const { ok, status, json } = await post('WhatsApp (Meta)', `https://graph.facebook.com/v21.0/${row.whatsapp_sender}/messages`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, ...message }),
    });
    if (!ok) throw new ProviderError(`WhatsApp (Meta): ${reason(json, status)}`);
    return { messageId: json?.messages?.[0]?.id || null, provider: 'meta' };
  }
  const content: Record<string, string> = row.whatsapp_template
    ? { ContentSid: row.whatsapp_template, ContentVariables: JSON.stringify({ 1: templateValue(text) }) }
    : { Body: String(text).slice(0, 1600) };
  const messageId = await twilioSend('Twilio WhatsApp', row.whatsapp_account_sid, token, {
    To: `whatsapp:+${phone}`,
    ...twilioFrom(row.whatsapp_sender, 'whatsapp:'),
    ...content,
  });
  return { messageId, provider: 'twilio' };
};
