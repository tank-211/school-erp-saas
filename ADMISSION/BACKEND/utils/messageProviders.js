/**
 * utils/messageProviders.js — sends one email, SMS or WhatsApp message
 * through a provider's web API. No database access and no secrets stored:
 * callers pass the school's (decrypted) settings.
 *
 * The same file is used by:
 *   SUPER-ADMIN/BACKEND/utils/messageProviders.js (CommonJS, test sends)
 *   LEAD/BACKEND/src/utils/messageProviders.js    (ES module)
 *   ADMISSION/BACKEND/utils/messageProviders.js   (ES module)
 * and FEES/backend/src/services/schoolMessenger.ts follows the same rules.
 * Keep them in step: only the last line (exports) differs.
 *
 * Web APIs are used because Render's free plan blocks the SMTP ports, and
 * they report the provider's own reason when a message is refused.
 *
 *   Email:    Brevo, Resend
 *   SMS:      MSG91 (DLT template), Twilio
 *   WhatsApp: Meta WhatsApp Cloud API, Twilio
 */

const EMAIL_PROVIDERS = {
  brevo: {
    label: 'Brevo',
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: (apiKey) => ({ 'api-key': apiKey }),
    body: ({ fromName, fromAddress, replyTo, to, subject, text, html, files }) => ({
      sender: { name: fromName || fromAddress, email: fromAddress },
      to: to.map((email) => ({ email })),
      subject,
      ...(text ? { textContent: text } : {}),
      ...(html ? { htmlContent: html } : {}),
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      ...(files && files.length ? { attachment: files.map((f) => ({ name: f.filename, content: f.base64 })) } : {}),
    }),
    messageId: (json) => (json && json.messageId) || null,
  },
  resend: {
    label: 'Resend',
    url: 'https://api.resend.com/emails',
    headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    body: ({ fromName, fromAddress, replyTo, to, subject, text, html, files }) => ({
      from: fromName ? `${fromName} <${fromAddress}>` : fromAddress,
      to,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(files && files.length ? { attachments: files.map((f) => ({ filename: f.filename, content: f.base64 })) } : {}),
    }),
    messageId: (json) => (json && json.id) || null,
  },
};

const API_PROVIDERS = Object.keys(EMAIL_PROVIDERS);
const SMS_PROVIDERS = ['msg91', 'twilio'];
const WHATSAPP_PROVIDERS = ['meta', 'twilio'];
const PROVIDER_LABELS = { brevo: 'Brevo', resend: 'Resend', smtp: 'SMTP', msg91: 'MSG91', twilio: 'Twilio', meta: 'WhatsApp Cloud API (Meta)' };

const TIMEOUT_MS = 20000;

class ProviderError extends Error {
  constructor(message, providerStatus) {
    super(message);
    this.name = 'ProviderError';
    this.providerStatus = providerStatus || null;
  }
}

// The provider's own explanation, e.g. "Key not found", "Template not approved"
const providerReason = (json, status) => {
  if (!json) return `the service answered with status ${status}`;
  const err = json.error;
  return (
    (err && typeof err === 'object' && (err.error_user_msg || err.message)) ||
    (typeof err === 'string' && err) ||
    json.message ||
    json.name ||
    `the service answered with status ${status}`
  );
};

const post = async (label, url, init) => {
  let response;
  try {
    response = await fetch(url, { method: 'POST', ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ProviderError(`Could not reach ${label}. Try again in a minute.`);
  }
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { response, json };
};

/**
 * Phone number as digits with the country code, e.g. "919876543210".
 * Numbers without a country code are taken as Indian (+91).
 */
const normalizePhone = (value) => {
  const raw = String(value == null ? '' : value).trim();
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

const requirePhone = (to) => {
  const phone = normalizePhone(to);
  if (!phone) throw new ProviderError(`"${String(to || '').slice(0, 30)}" is not a valid mobile number.`);
  return phone;
};

// WhatsApp template values may not contain new lines, tabs or long runs of spaces
const templateValue = (text) => String(text || '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, 1000);

const twilioAuth = (accountSid, authToken) =>
  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

const twilioSend = async (label, { accountSid, authToken, form }) => {
  if (!/^AC[0-9a-zA-Z]{32}$/.test(String(accountSid || ''))) throw new ProviderError('Twilio Account SID must start with AC.');
  const { response, json } = await post(label, `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    headers: { Authorization: twilioAuth(accountSid, authToken), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(form).toString(),
  });
  if (!response.ok) throw new ProviderError(`${label}: ${providerReason(json, response.status)}`, response.status);
  return (json && json.sid) || null;
};

// Twilio "From": a phone number, or a Messaging Service SID (MG...)
const twilioFrom = (sender, prefix = '') => {
  const value = String(sender || '').trim();
  if (/^MG[0-9a-zA-Z]{32}$/.test(value)) return { MessagingServiceSid: value };
  const phone = normalizePhone(value);
  if (!phone) throw new ProviderError('Enter the Twilio number to send from (with country code), or a Messaging Service SID (MG...).');
  return { From: `${prefix}+${phone}` };
};

/** Email: { provider, apiKey, fromName, fromAddress, replyTo, to, subject, text, html, files } */
const sendEmailApi = async ({ provider, apiKey, fromName, fromAddress, replyTo, to, subject, text, html, files }) => {
  const p = EMAIL_PROVIDERS[provider];
  if (!p) throw new ProviderError(`Unknown email service: ${provider}`);
  const recipients = (Array.isArray(to) ? to : [to]).map((x) => String(x || '').trim()).filter(Boolean);
  const { response, json } = await post(p.label, p.url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...p.headers(apiKey) },
    body: JSON.stringify(p.body({ fromName, fromAddress, replyTo, to: recipients, subject, text, html, files })),
  });
  if (!response.ok) throw new ProviderError(`${p.label}: ${providerReason(json, response.status)}`, response.status);
  return { messageId: p.messageId(json), provider };
};

/**
 * SMS: { provider, apiKey, accountSid, sender, templateId, templateVar, to, text }
 * MSG91 sends a DLT-approved template; `text` fills its variable (templateVar,
 * e.g. "var1"). Twilio sends `text` as it is.
 */
const sendSmsApi = async ({ provider, apiKey, accountSid, sender, templateId, templateVar, to, text }) => {
  const phone = requirePhone(to);
  if (provider === 'msg91') {
    if (!templateId) throw new ProviderError('MSG91 needs the DLT template ID.');
    const recipient = { mobiles: phone, [templateVar || 'var1']: String(text || '').trim() };
    const { response, json } = await post('MSG91', 'https://control.msg91.com/api/v5/flow', {
      headers: { authkey: apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ template_id: templateId, short_url: '0', ...(sender ? { sender } : {}), recipients: [recipient] }),
    });
    // MSG91 answers 200 with type "error" for refused requests
    if (!response.ok || (json && json.type && json.type !== 'success')) {
      throw new ProviderError(`MSG91: ${providerReason(json, response.status)}`, response.status);
    }
    return { messageId: (json && (json.request_id || json.message)) || null, provider };
  }
  if (provider === 'twilio') {
    const messageId = await twilioSend('Twilio', {
      accountSid,
      authToken: apiKey,
      form: { To: `+${phone}`, Body: String(text || '').slice(0, 1600), ...twilioFrom(sender) },
    });
    return { messageId, provider };
  }
  throw new ProviderError(`Unknown SMS service: ${provider}`);
};

/**
 * WhatsApp: { provider, token, accountSid, sender, template, templateLang, to, text }
 * With a template (Meta: approved template name; Twilio: Content SID HX...),
 * `text` fills its first variable {{1}}. Without one, `text` is sent as a
 * normal message, which WhatsApp only delivers within 24 hours of the
 * parent's last message.
 */
const sendWhatsAppApi = async ({ provider, token, accountSid, sender, template, templateLang, to, text }) => {
  const phone = requirePhone(to);
  if (provider === 'meta') {
    if (!/^\d{5,25}$/.test(String(sender || ''))) throw new ProviderError('Enter the WhatsApp phone number ID from Meta (numbers only).');
    const message = template
      ? {
          type: 'template',
          template: {
            name: template,
            language: { code: templateLang || 'en' },
            components: [{ type: 'body', parameters: [{ type: 'text', text: templateValue(text) }] }],
          },
        }
      : { type: 'text', text: { preview_url: false, body: String(text || '').slice(0, 4096) } };
    const { response, json } = await post('WhatsApp (Meta)', `https://graph.facebook.com/v21.0/${sender}/messages`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, ...message }),
    });
    if (!response.ok) throw new ProviderError(`WhatsApp (Meta): ${providerReason(json, response.status)}`, response.status);
    return { messageId: (json && json.messages && json.messages[0] && json.messages[0].id) || null, provider };
  }
  if (provider === 'twilio') {
    const content = template
      ? { ContentSid: template, ContentVariables: JSON.stringify({ 1: templateValue(text) }) }
      : { Body: String(text || '').slice(0, 1600) };
    const messageId = await twilioSend('Twilio WhatsApp', {
      accountSid,
      authToken: token,
      form: { To: `whatsapp:+${phone}`, ...twilioFrom(sender, 'whatsapp:'), ...content },
    });
    return { messageId, provider };
  }
  throw new ProviderError(`Unknown WhatsApp service: ${provider}`);
};

// Kept for the email test send (older name)
const sendWithApi = sendEmailApi;

export { sendEmailApi, sendWithApi, sendSmsApi, sendWhatsAppApi, normalizePhone, ProviderError, API_PROVIDERS, SMS_PROVIDERS, WHATSAPP_PROVIDERS, PROVIDER_LABELS };
