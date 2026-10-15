/**
 * utils/emailProviders.js — sends one email through an email service's web API.
 *
 * Used by the Control Portal to send a test email with a school's settings.
 * Lead and Admission send the school's real emails with the same rules
 * (LEAD/BACKEND/src/utils/schoolMailer.js, ADMISSION/BACKEND/utils/schoolMailer.js).
 *
 * Web APIs are used rather than SMTP because Render's free plan blocks the
 * SMTP ports (465, 587), so SMTP from these servers never connects.
 */

const PROVIDERS = {
  brevo: {
    label: 'Brevo',
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: (apiKey) => ({ 'api-key': apiKey }),
    body: ({ fromName, fromAddress, replyTo, to, subject, text, html }) => ({
      sender: { name: fromName || fromAddress, email: fromAddress },
      to: to.map((email) => ({ email })),
      subject,
      ...(text ? { textContent: text } : {}),
      ...(html ? { htmlContent: html } : {}),
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
    messageId: (json) => json?.messageId || null,
  },
  resend: {
    label: 'Resend',
    url: 'https://api.resend.com/emails',
    headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    body: ({ fromName, fromAddress, replyTo, to, subject, text, html }) => ({
      from: fromName ? `${fromName} <${fromAddress}>` : fromAddress,
      to,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    messageId: (json) => json?.id || null,
  },
};

const API_PROVIDERS = Object.keys(PROVIDERS);

// The provider's own explanation, e.g. "Key not found" or "sender not verified"
const providerMessage = (json, status) =>
  json?.message || json?.error?.message || json?.error || json?.name || `the service answered with status ${status}`;

/** Sends one email; throws an Error whose message names the provider and its reason. */
const sendWithApi = async ({ provider, apiKey, fromName, fromAddress, replyTo, to, subject, text, html }) => {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown email service: ${provider}`);
  const recipients = (Array.isArray(to) ? to : [to]).map((x) => String(x || '').trim()).filter(Boolean);

  let response;
  try {
    response = await fetch(p.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...p.headers(apiKey) },
      body: JSON.stringify(p.body({ fromName, fromAddress, replyTo, to: recipients, subject, text, html })),
      signal: AbortSignal.timeout(15000),
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
    const error = new Error(`${p.label}: ${providerMessage(json, response.status)}`);
    error.providerStatus = response.status;
    throw error;
  }
  return { messageId: p.messageId(json), provider };
};

module.exports = { sendWithApi, API_PROVIDERS, PROVIDER_LABELS: { brevo: 'Brevo', resend: 'Resend', smtp: 'SMTP' } };
