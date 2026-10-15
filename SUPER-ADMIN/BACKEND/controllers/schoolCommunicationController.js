/**
 * Each school's own email, SMS and WhatsApp accounts (Super Admin enters them
 * for the school, like the school's Razorpay account).
 *
 *   GET    /api/super-admin/schools/:id/communication                   any staff
 *   PUT    /api/super-admin/schools/:id/communication/:channel          super admin
 *   POST   /api/super-admin/schools/:id/communication/:channel/test     super admin
 *   DELETE /api/super-admin/schools/:id/communication/:channel          super admin
 *   (:channel = email | sms | whatsapp; the routes without :channel mean email)
 *
 * Lead, Admission and Fees send that school's messages through these
 * accounts. Secrets (API keys, tokens, SMTP password) are stored encrypted
 * (utils/secretBox) and never returned.
 */
const prisma = require('../config/prisma');
const { encrypt, decrypt } = require('../utils/secretBox');
const { serializeBigInt } = require('../utils/bigintSerializer');
const {
  sendEmailApi,
  sendSmsApi,
  sendWhatsAppApi,
  normalizePhone,
  API_PROVIDERS,
  SMS_PROVIDERS,
  WHATSAPP_PROVIDERS,
} = require('../utils/messageProviders');

const CHANNELS = ['email', 'sms', 'whatsapp'];
const CHANNEL_LABEL = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TWILIO_SID = /^AC[0-9a-zA-Z]{32}$/;
const TWILIO_SERVICE = /^MG[0-9a-zA-Z]{32}$/;
const TWILIO_CONTENT = /^HX[0-9a-zA-Z]{32}$/;

const parseSchoolId = (req) => (/^\d+$/.test(String(req.params.id || '')) ? BigInt(req.params.id) : null);
const channelOf = (req) => String(req.params.channel || 'email').toLowerCase();
const clean = (value, max) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
};

class InputError extends Error {}
const need = (condition, message) => {
  if (!condition) throw new InputError(message);
};

const common = (row, prefix) => ({
  status: row?.[`${prefix}_status`] || 'not_configured',
  last_tested_at: row?.[`${prefix}_last_tested_at`] || null,
  last_error: row?.[`${prefix}_last_error`] || null,
});

const shapeEmail = (row) => ({
  provider: row?.email_provider || null,
  from_name: row?.email_from_name || null,
  from_address: row?.email_from_address || null,
  reply_to: row?.email_reply_to || null,
  smtp_host: row?.smtp_host || null,
  smtp_port: row?.smtp_port ?? null,
  smtp_secure: row?.smtp_secure ?? null,
  smtp_user: row?.smtp_user || null,
  has_api_key: Boolean(row?.email_api_key_enc),
  has_smtp_password: Boolean(row?.smtp_pass_enc),
  ...common(row, 'email'),
});

const shapeSms = (row) => ({
  provider: row?.sms_provider || null,
  sender: row?.sms_sender || null,
  account_sid: row?.sms_account_sid || null,
  template_id: row?.sms_template_id || null,
  template_var: row?.sms_template_var || null,
  has_api_key: Boolean(row?.sms_api_key_enc),
  ...common(row, 'sms'),
});

const shapeWhatsApp = (row) => ({
  provider: row?.whatsapp_provider || null,
  sender: row?.whatsapp_sender || null,
  account_sid: row?.whatsapp_account_sid || null,
  template: row?.whatsapp_template || null,
  template_lang: row?.whatsapp_template_lang || null,
  has_token: Boolean(row?.whatsapp_token_enc),
  ...common(row, 'whatsapp'),
});

const shapeAll = (row) => ({
  email: shapeEmail(row),
  sms: shapeSms(row),
  whatsapp: shapeWhatsApp(row),
  updated_by: row?.updated_by || null,
});

const tableMissing = (err) =>
  err?.code === 'P2021' || err?.code === 'P2022' || /does not exist/i.test(err?.message || '');
const notSetUpMessage =
  'School communication settings are not set up in the database yet. Run prisma/sql/2026-10-15_school_communication_settings.sql in Neon.';
const fail = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });

const loadSchool = (id) =>
  prisma.school.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true } });
const actorName = (req) => String(req.staffUser?.full_name || req.staffUser?.email || '').slice(0, 150) || null;

/* ---------- what each channel saves ---------- */

// Returns { data, changed } for the email columns
const emailData = (body, existing, school) => {
  const provider = String(body.provider || '').trim().toLowerCase();
  need([...API_PROVIDERS, 'smtp'].includes(provider), 'Choose the email service: Brevo, Resend or SMTP.');
  const fromAddress = clean(body.from_address, 150);
  need(fromAddress && EMAIL.test(fromAddress), 'Enter the email address emails are sent from (it must be verified with the email service).');
  const replyTo = clean(body.reply_to, 150);
  need(!replyTo || EMAIL.test(replyTo), 'The reply-to address is not a valid email.');
  const apiKey = clean(body.api_key, 500);
  const smtpPassword = clean(body.smtp_password, 500);

  const data = {
    email_provider: provider,
    email_from_name: clean(body.from_name, 150) || school.name.slice(0, 150),
    email_from_address: fromAddress,
    email_reply_to: replyTo,
  };

  if (provider === 'smtp') {
    const host = clean(body.smtp_host, 150);
    const port = Number(body.smtp_port);
    const user = clean(body.smtp_user, 150);
    need(host && /^[a-z0-9.-]+$/i.test(host), 'Enter the SMTP server, e.g. smtp.gmail.com.');
    need(Number.isInteger(port) && port >= 1 && port <= 65535, 'Enter the SMTP port, e.g. 587.');
    need(user, 'Enter the SMTP user name.');
    const sameAccount = existing?.email_provider === 'smtp' && existing?.smtp_user === user && existing?.smtp_host === host;
    need(smtpPassword || (sameAccount && existing?.smtp_pass_enc), 'Enter the SMTP password (an app password for Gmail).');
    Object.assign(data, { smtp_host: host, smtp_port: port, smtp_secure: body.smtp_secure === true || port === 465, smtp_user: user, email_api_key_enc: null });
    if (smtpPassword) data.smtp_pass_enc = encrypt(smtpPassword);
  } else {
    need(apiKey || (existing?.email_provider === provider && existing?.email_api_key_enc), 'Enter the API key from the email service.');
    if (apiKey) data.email_api_key_enc = encrypt(apiKey);
    Object.assign(data, { smtp_host: null, smtp_port: null, smtp_secure: null, smtp_user: null, smtp_pass_enc: null });
  }

  const changed =
    !existing?.email_provider ||
    existing.email_provider !== provider ||
    existing.email_from_address !== fromAddress ||
    Boolean(apiKey) ||
    Boolean(smtpPassword) ||
    existing.email_status === 'disconnected' ||
    (provider === 'smtp' && (existing.smtp_host !== data.smtp_host || existing.smtp_port !== data.smtp_port || existing.smtp_user !== data.smtp_user));
  return { data, changed };
};

const smsData = (body, existing) => {
  const provider = String(body.provider || '').trim().toLowerCase();
  need(SMS_PROVIDERS.includes(provider), 'Choose the SMS service: MSG91 or Twilio.');
  const apiKey = clean(body.api_key, 500);
  const sender = clean(body.sender, 100);
  const data = { sms_provider: provider };

  if (provider === 'msg91') {
    const templateId = clean(body.template_id, 100);
    const templateVar = clean(body.template_var, 50) || 'var1';
    need(templateId && /^[A-Za-z0-9_-]+$/.test(templateId), 'Enter the MSG91 template ID of the DLT-approved SMS template.');
    need(/^[A-Za-z0-9_]+$/.test(templateVar), 'The template variable name may only have letters, numbers and _ (e.g. var1).');
    need(!sender || /^[A-Za-z0-9]{3,11}$/.test(sender), 'The sender ID is the 6-letter DLT header, e.g. ABCSCH.');
    need(apiKey || (existing?.sms_provider === 'msg91' && existing?.sms_api_key_enc), 'Enter the MSG91 auth key.');
    Object.assign(data, { sms_sender: sender, sms_template_id: templateId, sms_template_var: templateVar, sms_account_sid: null });
  } else {
    const accountSid = clean(body.account_sid, 100);
    need(accountSid && TWILIO_SID.test(accountSid), 'Enter the Twilio Account SID (starts with AC).');
    need(sender && (TWILIO_SERVICE.test(sender) || normalizePhone(sender)), 'Enter the Twilio number to send from (with country code, e.g. +1...) or a Messaging Service SID (MG...).');
    const sameAccount = existing?.sms_provider === 'twilio' && existing?.sms_account_sid === accountSid;
    need(apiKey || (sameAccount && existing?.sms_api_key_enc), 'Enter the Twilio auth token.');
    Object.assign(data, { sms_account_sid: accountSid, sms_sender: sender, sms_template_id: null, sms_template_var: null });
  }
  if (apiKey) data.sms_api_key_enc = encrypt(apiKey);

  const changed =
    !existing?.sms_provider ||
    existing.sms_provider !== provider ||
    Boolean(apiKey) ||
    existing.sms_status === 'disconnected' ||
    ['sms_sender', 'sms_account_sid', 'sms_template_id', 'sms_template_var'].some((k) => (existing[k] || null) !== (data[k] || null));
  return { data, changed };
};

const whatsappData = (body, existing) => {
  const provider = String(body.provider || '').trim().toLowerCase();
  need(WHATSAPP_PROVIDERS.includes(provider), 'Choose the WhatsApp service: WhatsApp Cloud API (Meta) or Twilio.');
  const token = clean(body.token, 1000);
  const sender = clean(body.sender, 100);
  const template = clean(body.template, 150);
  const data = { whatsapp_provider: provider };

  if (provider === 'meta') {
    need(sender && /^\d{5,25}$/.test(sender), 'Enter the phone number ID from Meta (WhatsApp → API Setup; numbers only, not the phone number).');
    need(!template || /^[a-z0-9_]+$/.test(template), 'The template name is the approved template\'s name, e.g. school_message (small letters, numbers and _).');
    const lang = clean(body.template_lang, 20) || 'en';
    need(/^[A-Za-z]{2,3}(_[A-Za-z]{2,4})?$/.test(lang), 'The template language is a code like en, en_US or hi.');
    need(token || (existing?.whatsapp_provider === 'meta' && existing?.whatsapp_token_enc), 'Enter the permanent access token from Meta.');
    Object.assign(data, { whatsapp_sender: sender, whatsapp_template: template, whatsapp_template_lang: template ? lang : null, whatsapp_account_sid: null });
  } else {
    const accountSid = clean(body.account_sid, 100);
    need(accountSid && TWILIO_SID.test(accountSid), 'Enter the Twilio Account SID (starts with AC).');
    need(sender && (TWILIO_SERVICE.test(sender) || normalizePhone(sender)), 'Enter the school\'s WhatsApp number in Twilio (with country code) or a Messaging Service SID (MG...).');
    need(!template || TWILIO_CONTENT.test(template), 'The Twilio template is its Content SID (starts with HX).');
    const sameAccount = existing?.whatsapp_provider === 'twilio' && existing?.whatsapp_account_sid === accountSid;
    need(token || (sameAccount && existing?.whatsapp_token_enc), 'Enter the Twilio auth token.');
    Object.assign(data, { whatsapp_account_sid: accountSid, whatsapp_sender: sender, whatsapp_template: template, whatsapp_template_lang: null });
  }
  if (token) data.whatsapp_token_enc = encrypt(token);

  const changed =
    !existing?.whatsapp_provider ||
    existing.whatsapp_provider !== provider ||
    Boolean(token) ||
    existing.whatsapp_status === 'disconnected' ||
    ['whatsapp_sender', 'whatsapp_account_sid', 'whatsapp_template', 'whatsapp_template_lang'].some((k) => (existing[k] || null) !== (data[k] || null));
  return { data, changed };
};

const BUILDERS = { email: emailData, sms: smsData, whatsapp: whatsappData };

/* ---------- handlers ---------- */

const getSchoolCommunication = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const school = await loadSchool(id);
    if (!school) return fail(res, 404, 'School not found.');
    const row = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    return res.json(
      serializeBigInt({ school_name: school.name, school_email: school.email || null, school_phone: school.phone || null, ...shapeAll(row) })
    );
  } catch (err) {
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error('Get school communication error:', err.message);
    return fail(res, 500, 'Failed to load the school communication settings.');
  }
};

const saveSchoolCommunication = async (req, res) => {
  const channel = channelOf(req);
  try {
    if (!CHANNELS.includes(channel)) return fail(res, 404, 'Unknown channel.');
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const school = await loadSchool(id);
    if (!school) return fail(res, 404, 'School not found.');

    const existing = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    let built;
    try {
      built = BUILDERS[channel](req.body || {}, existing, school);
    } catch (e) {
      if (e instanceof InputError) return fail(res, 400, e.message);
      throw e;
    }
    const { data, changed } = built;
    // A change of service, sender or credentials must pass a test again
    if (changed) {
      data[`${channel}_status`] = 'configured';
      data[`${channel}_last_error`] = null;
    }
    data.updated_by = actorName(req);
    data.updated_at = new Date();

    const row = await prisma.school_communication_settings.upsert({
      where: { school_id: id },
      update: data,
      create: { school_id: id, ...data },
    });
    const all = shapeAll(row);
    return res.json(
      serializeBigInt({
        message: changed ? `${CHANNEL_LABEL[channel]} saved. Send a test to check it.` : `${CHANNEL_LABEL[channel]} saved.`,
        ...all,
      })
    );
  } catch (err) {
    if (err.code === 'PAYMENT_KEYS_SECRET_MISSING') return fail(res, 500, err.message);
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error(`Save school ${channel} error:`, err.message);
    return fail(res, 500, `Failed to save the school's ${CHANNEL_LABEL[channel] || 'communication'} settings.`);
  }
};

const testMessage = (school, channel) =>
  `Test message from ${school.name}. If you received this, the school's ${CHANNEL_LABEL[channel]} is working.`;

const sendTest = async (channel, row, school, to) => {
  if (channel === 'email') {
    return sendEmailApi({
      provider: row.email_provider,
      apiKey: decrypt(row.email_api_key_enc),
      fromName: row.email_from_name,
      fromAddress: row.email_from_address,
      replyTo: row.email_reply_to,
      to,
      subject: `Test email from ${school.name}`,
      text: `This is a test email from ${school.name}, sent from the School ERP Control Portal. If you can read it, the school's email account is working.`,
    });
  }
  if (channel === 'sms') {
    return sendSmsApi({
      provider: row.sms_provider,
      apiKey: decrypt(row.sms_api_key_enc),
      accountSid: row.sms_account_sid,
      sender: row.sms_sender,
      templateId: row.sms_template_id,
      templateVar: row.sms_template_var,
      to,
      text: testMessage(school, channel),
    });
  }
  return sendWhatsAppApi({
    provider: row.whatsapp_provider,
    token: decrypt(row.whatsapp_token_enc),
    accountSid: row.whatsapp_account_sid,
    sender: row.whatsapp_sender,
    template: row.whatsapp_template,
    templateLang: row.whatsapp_template_lang,
    to,
    text: testMessage(school, channel),
  });
};

const SECRET_COLUMN = { email: 'email_api_key_enc', sms: 'sms_api_key_enc', whatsapp: 'whatsapp_token_enc' };

const testSchoolCommunication = async (req, res) => {
  const channel = channelOf(req);
  try {
    if (!CHANNELS.includes(channel)) return fail(res, 404, 'Unknown channel.');
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const school = await loadSchool(id);
    if (!school) return fail(res, 404, 'School not found.');
    const row = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    if (!row?.[`${channel}_provider`]) return fail(res, 400, `Save the ${CHANNEL_LABEL[channel]} settings first.`);

    const to = clean(req.body?.to, 150);
    if (channel === 'email') {
      if (!to || !EMAIL.test(to)) return fail(res, 400, 'Enter the address to send the test email to.');
      if (row.email_provider === 'smtp') {
        return fail(
          res,
          400,
          "SMTP accounts cannot be tested from here. Note that Render's free plan blocks SMTP, so on free hosting emails will not send; Brevo or Resend work on any plan."
        );
      }
    } else if (!normalizePhone(to)) {
      return fail(res, 400, 'Enter the mobile number to send the test to (10 digits, or with country code).');
    }
    if (!row[SECRET_COLUMN[channel]]) return fail(res, 400, `The ${CHANNEL_LABEL[channel]} key was removed. Enter it again and save.`);

    const now = new Date();
    try {
      await sendTest(channel, row, school, to);
    } catch (sendError) {
      if (sendError.code === 'PAYMENT_KEYS_SECRET_MISSING') return fail(res, 500, sendError.message);
      const message = /Unsupported state|unable to authenticate|bad decrypt/i.test(sendError.message)
        ? 'The saved key cannot be read. Enter it again and save.'
        : sendError.message;
      const saved = await prisma.school_communication_settings.update({
        where: { school_id: id },
        data: { [`${channel}_status`]: 'failed', [`${channel}_last_tested_at`]: now, [`${channel}_last_error`]: String(message).slice(0, 500) },
      });
      return res.status(400).json(serializeBigInt({ error: message, ...shapeAll(saved) }));
    }

    const saved = await prisma.school_communication_settings.update({
      where: { school_id: id },
      data: { [`${channel}_status`]: 'connected', [`${channel}_last_tested_at`]: now, [`${channel}_last_error`]: null },
    });
    return res.json(
      serializeBigInt({
        message: `Test ${channel === 'email' ? 'email' : CHANNEL_LABEL[channel] + ' message'} sent to ${to}. When it arrives, the school can send ${CHANNEL_LABEL[channel]}.`,
        ...shapeAll(saved),
      })
    );
  } catch (err) {
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error(`Test school ${channel} error:`, err.message);
    return fail(res, 500, `Failed to test the school's ${CHANNEL_LABEL[channel] || 'communication'} account.`);
  }
};

const disconnectSchoolCommunication = async (req, res) => {
  const channel = channelOf(req);
  try {
    if (!CHANNELS.includes(channel)) return fail(res, 404, 'Unknown channel.');
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const row = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    if (!row?.[`${channel}_provider`]) return fail(res, 404, `This school has no ${CHANNEL_LABEL[channel]} account set up.`);
    const secrets = channel === 'email' ? { email_api_key_enc: null, smtp_pass_enc: null } : { [SECRET_COLUMN[channel]]: null };
    const saved = await prisma.school_communication_settings.update({
      where: { school_id: id },
      data: {
        ...secrets,
        [`${channel}_status`]: 'disconnected',
        [`${channel}_last_error`]: null,
        updated_by: actorName(req),
        updated_at: new Date(),
      },
    });
    return res.json(
      serializeBigInt({
        message: `${CHANNEL_LABEL[channel]} disconnected. The school cannot send ${CHANNEL_LABEL[channel]} until new details are saved.`,
        ...shapeAll(saved),
      })
    );
  } catch (err) {
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error(`Disconnect school ${channel} error:`, err.message);
    return fail(res, 500, `Failed to disconnect the school's ${CHANNEL_LABEL[channel] || 'communication'} account.`);
  }
};

/** { email, sms, whatsapp } status per school for the schools list; empty when the table is missing. */
const communicationStatusBySchool = async () => {
  try {
    const rows = await prisma.school_communication_settings.findMany({
      select: { school_id: true, email_status: true, sms_status: true, whatsapp_status: true },
    });
    return new Map(rows.map((r) => [String(r.school_id), { email: r.email_status, sms: r.sms_status, whatsapp: r.whatsapp_status }]));
  } catch {
    return new Map();
  }
};

module.exports = {
  getSchoolCommunication,
  saveSchoolCommunication,
  testSchoolCommunication,
  disconnectSchoolCommunication,
  communicationStatusBySchool,
  CHANNELS,
};
