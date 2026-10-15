/**
 * Each school's own email account (Super Admin enters it for the school).
 *
 *   GET    /api/super-admin/schools/:id/communication        any staff
 *   PUT    /api/super-admin/schools/:id/communication        super admin
 *   POST   /api/super-admin/schools/:id/communication/test   super admin
 *   DELETE /api/super-admin/schools/:id/communication        super admin
 *
 * Lead and Admission send that school's emails (to leads, parents, campaigns)
 * through this account. Secrets (API key, SMTP password) are stored encrypted
 * (utils/secretBox) and never returned.
 */
const prisma = require('../config/prisma');
const { encrypt, decrypt } = require('../utils/secretBox');
const { serializeBigInt } = require('../utils/bigintSerializer');
const { sendWithApi, API_PROVIDERS } = require('../utils/emailProviders');

const PROVIDERS = [...API_PROVIDERS, 'smtp'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseSchoolId = (req) => (/^\d+$/.test(String(req.params.id || '')) ? BigInt(req.params.id) : null);
const clean = (value, max) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
};

const shape = (row) => ({
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
  status: row?.email_status || 'not_configured',
  last_tested_at: row?.email_last_tested_at || null,
  last_error: row?.email_last_error || null,
  updated_by: row?.updated_by || null,
});

const tableMissing = (err) => err?.code === 'P2021' || /does not exist/i.test(err?.message || '');
const notSetUpMessage =
  'School communication settings are not set up in the database yet. Run prisma/sql/2026-10-15_school_communication_settings.sql in Neon.';
const fail = (res, status, error) => res.status(status).json({ error });

const loadSchool = (id) => prisma.school.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
const actorName = (req) => String(req.staffUser?.full_name || req.staffUser?.email || '').slice(0, 150) || null;

const getSchoolCommunication = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const school = await loadSchool(id);
    if (!school) return fail(res, 404, 'School not found.');
    const row = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    return res.json(serializeBigInt({ school_name: school.name, school_email: school.email || null, email: shape(row) }));
  } catch (err) {
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error('Get school communication error:', err.message);
    return fail(res, 500, 'Failed to load the school communication settings.');
  }
};

const saveSchoolCommunication = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const school = await loadSchool(id);
    if (!school) return fail(res, 404, 'School not found.');

    const body = req.body || {};
    const provider = String(body.provider || '').trim().toLowerCase();
    if (!PROVIDERS.includes(provider)) {
      return fail(res, 400, 'Choose the email service: Brevo, Resend or SMTP.');
    }
    const fromAddress = clean(body.from_address, 150);
    if (!fromAddress || !EMAIL.test(fromAddress)) {
      return fail(res, 400, 'Enter the email address emails are sent from (it must be verified with the email service).');
    }
    const replyTo = clean(body.reply_to, 150);
    if (replyTo && !EMAIL.test(replyTo)) return fail(res, 400, 'The reply-to address is not a valid email.');

    const existing = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    const apiKey = clean(body.api_key, 500);
    const smtpPassword = clean(body.smtp_password, 500);

    const data = {
      email_provider: provider,
      email_from_name: clean(body.from_name, 150) || school.name.slice(0, 150),
      email_from_address: fromAddress,
      email_reply_to: replyTo,
      updated_by: actorName(req),
      updated_at: new Date(),
    };

    if (provider === 'smtp') {
      const host = clean(body.smtp_host, 150);
      const port = Number(body.smtp_port);
      const user = clean(body.smtp_user, 150);
      if (!host || !/^[a-z0-9.-]+$/i.test(host)) return fail(res, 400, 'Enter the SMTP server, e.g. smtp.gmail.com.');
      if (!Number.isInteger(port) || port < 1 || port > 65535) return fail(res, 400, 'Enter the SMTP port, e.g. 587.');
      if (!user) return fail(res, 400, 'Enter the SMTP user name.');
      const sameAccount = existing?.email_provider === 'smtp' && existing?.smtp_user === user && existing?.smtp_host === host;
      if (!smtpPassword && !(sameAccount && existing?.smtp_pass_enc)) {
        return fail(res, 400, 'Enter the SMTP password (an app password for Gmail).');
      }
      Object.assign(data, {
        smtp_host: host,
        smtp_port: port,
        smtp_secure: body.smtp_secure === true || port === 465,
        smtp_user: user,
        email_api_key_enc: null,
      });
      if (smtpPassword) data.smtp_pass_enc = encrypt(smtpPassword);
    } else {
      const sameProvider = existing?.email_provider === provider;
      if (!apiKey && !(sameProvider && existing?.email_api_key_enc)) {
        return fail(res, 400, 'Enter the API key from the email service.');
      }
      if (apiKey) data.email_api_key_enc = encrypt(apiKey);
      Object.assign(data, { smtp_host: null, smtp_port: null, smtp_secure: null, smtp_user: null, smtp_pass_enc: null });
    }

    // A change of service, sender or credentials must pass a test again
    const changed =
      !existing ||
      existing.email_provider !== provider ||
      existing.email_from_address !== fromAddress ||
      Boolean(apiKey) ||
      Boolean(smtpPassword) ||
      (provider === 'smtp' && (existing.smtp_host !== data.smtp_host || existing.smtp_port !== data.smtp_port || existing.smtp_user !== data.smtp_user));
    if (changed) {
      data.email_status = 'configured';
      data.email_last_error = null;
    }

    const row = await prisma.school_communication_settings.upsert({
      where: { school_id: id },
      update: data,
      create: { school_id: id, ...data },
    });
    return res.json(serializeBigInt({
      message: changed ? 'Saved. Send a test email to check it.' : 'Saved.',
      email: shape(row),
    }));
  } catch (err) {
    if (err.code === 'PAYMENT_KEYS_SECRET_MISSING') return fail(res, 500, err.message);
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error('Save school communication error:', err.message);
    return fail(res, 500, 'Failed to save the school communication settings.');
  }
};

const testSchoolCommunication = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const school = await loadSchool(id);
    if (!school) return fail(res, 404, 'School not found.');
    const row = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    if (!row?.email_provider) return fail(res, 400, 'Save the email settings first.');

    const to = clean(req.body?.to, 150);
    if (!to || !EMAIL.test(to)) return fail(res, 400, 'Enter the address to send the test email to.');

    if (row.email_provider === 'smtp') {
      return fail(
        res,
        400,
        'SMTP accounts cannot be tested from here. Note that Render\'s free plan blocks SMTP, so on free hosting emails will not send; Brevo or Resend work on any plan.'
      );
    }

    let apiKey;
    try {
      apiKey = decrypt(row.email_api_key_enc);
    } catch (e) {
      return fail(res, 500, e.code === 'PAYMENT_KEYS_SECRET_MISSING' ? e.message : 'The saved API key cannot be read. Save it again.');
    }

    const now = new Date();
    try {
      await sendWithApi({
        provider: row.email_provider,
        apiKey,
        fromName: row.email_from_name,
        fromAddress: row.email_from_address,
        replyTo: row.email_reply_to,
        to,
        subject: `Test email from ${school.name}`,
        text: `This is a test email from ${school.name}, sent from the School ERP Control Portal. If you can read it, the school's email account is working.`,
      });
    } catch (sendError) {
      const saved = await prisma.school_communication_settings.update({
        where: { school_id: id },
        data: { email_status: 'failed', email_last_tested_at: now, email_last_error: String(sendError.message).slice(0, 500) },
      });
      return res.status(400).json(serializeBigInt({ error: sendError.message, email: shape(saved) }));
    }

    const saved = await prisma.school_communication_settings.update({
      where: { school_id: id },
      data: { email_status: 'connected', email_last_tested_at: now, email_last_error: null },
    });
    return res.json(serializeBigInt({ message: `Test email sent to ${to}. The school can now send email.`, email: shape(saved) }));
  } catch (err) {
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error('Test school communication error:', err.message);
    return fail(res, 500, 'Failed to test the school email account.');
  }
};

const disconnectSchoolCommunication = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return fail(res, 400, 'Invalid school id.');
    const row = await prisma.school_communication_settings.findUnique({ where: { school_id: id } });
    if (!row) return fail(res, 404, 'This school has no email account set up.');
    const saved = await prisma.school_communication_settings.update({
      where: { school_id: id },
      data: {
        email_status: 'disconnected',
        email_api_key_enc: null,
        smtp_pass_enc: null,
        email_last_error: null,
        updated_by: actorName(req),
        updated_at: new Date(),
      },
    });
    return res.json(serializeBigInt({ message: 'Disconnected. The school cannot send email until new details are saved.', email: shape(saved) }));
  } catch (err) {
    if (tableMissing(err)) return fail(res, 501, notSetUpMessage);
    console.error('Disconnect school communication error:', err.message);
    return fail(res, 500, 'Failed to disconnect the school email account.');
  }
};

/** Email status per school for the schools list; empty when the table is missing. */
const communicationStatusBySchool = async () => {
  try {
    const rows = await prisma.school_communication_settings.findMany({ select: { school_id: true, email_status: true } });
    return new Map(rows.map((r) => [String(r.school_id), r.email_status]));
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
};
