/**
 * Each school's own Razorpay account (Super Admin enters the school's keys).
 *
 *   GET    /api/super-admin/schools/:id/payment-gateway        any staff
 *   PUT    /api/super-admin/schools/:id/payment-gateway        super admin
 *   POST   /api/super-admin/schools/:id/payment-gateway/test   super admin
 *   DELETE /api/super-admin/schools/:id/payment-gateway        super admin
 *
 * Secrets (key secret, webhook secret) are stored encrypted (utils/secretBox)
 * and are never returned. The Fees app only takes online payments for a school
 * whose keys passed the test (status "connected").
 */
const prisma = require('../config/prisma');
const { encrypt, decrypt } = require('../utils/secretBox');
const { serializeBigInt } = require('../utils/bigintSerializer');

const KEY_ID = /^rzp_(test|live)_[A-Za-z0-9]{6,40}$/;

const parseSchoolId = (req) => (/^\d+$/.test(String(req.params.id || '')) ? BigInt(req.params.id) : null);

const webhookUrlFor = (schoolId) => {
  const base = String(process.env.FEES_PUBLIC_API_URL || '').replace(/\/+$/, '');
  const path = `/api/payments/razorpay/webhook/${schoolId}`;
  return base ? `${base}${path}` : path;
};

const shape = (schoolId, row) => ({
  school_id: String(schoolId),
  status: row?.status || 'not_connected',
  mode: row?.mode || null,
  key_id: row?.key_id || null,
  has_key_secret: Boolean(row?.key_secret_enc),
  has_webhook_secret: Boolean(row?.webhook_secret_enc),
  connected_at: row?.connected_at || null,
  last_tested_at: row?.last_tested_at || null,
  last_error: row?.last_error || null,
  updated_by: row?.updated_by || null,
  webhook_url: webhookUrlFor(schoolId),
});

const tableMissing = (err) => err?.code === 'P2021' || /does not exist/i.test(err?.message || '');
const notSetUpMessage =
  'School payment accounts are not set up in the database yet. Run prisma/sql/2026-09-30_school_razorpay_keys.sql in Neon.';

const loadSchool = async (id) =>
  prisma.school.findUnique({ where: { id }, select: { id: true, name: true } });

const getSchoolGateway = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return res.status(400).json({ error: 'Invalid school id.' });
    const school = await loadSchool(id);
    if (!school) return res.status(404).json({ error: 'School not found.' });
    const row = await prisma.school_payment_gateway.findUnique({ where: { school_id: id } });
    return res.json(serializeBigInt({ school_name: school.name, gateway: shape(id, row) }));
  } catch (err) {
    if (tableMissing(err)) return res.status(501).json({ error: notSetUpMessage });
    console.error('Get school gateway error:', err.message);
    return res.status(500).json({ error: 'Failed to load the school payment account.' });
  }
};

const saveSchoolGateway = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return res.status(400).json({ error: 'Invalid school id.' });
    const school = await loadSchool(id);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const keyId = String(req.body?.key_id || '').trim();
    const keySecret = String(req.body?.key_secret || '').trim();
    const webhookSecret = String(req.body?.webhook_secret || '').trim();

    const match = KEY_ID.exec(keyId);
    if (!match) {
      return res.status(400).json({ error: 'Key ID must look like rzp_test_... or rzp_live_... (from the school\'s Razorpay dashboard).' });
    }

    const existing = await prisma.school_payment_gateway.findUnique({ where: { school_id: id } });
    const keyChanged = !existing || existing.key_id !== keyId;
    if ((keyChanged || !existing?.key_secret_enc) && !keySecret) {
      return res.status(400).json({ error: 'Enter the Key Secret for this Key ID.' });
    }
    if (keySecret && keySecret.length < 10) {
      return res.status(400).json({ error: 'The Key Secret looks too short.' });
    }

    const data = {
      provider: 'razorpay',
      key_id: keyId,
      mode: match[1],
      updated_by: String(req.staffUser?.full_name || req.staffUser?.email || '').slice(0, 150) || null,
    };
    // Changed keys must pass the test again before the school takes payments;
    // saving anything else (e.g. only the webhook secret) keeps the status
    if (keyChanged || keySecret) {
      data.status = 'configured';
      data.connected_at = null;
      data.last_error = null;
    }
    if (keySecret) data.key_secret_enc = encrypt(keySecret);
    if (webhookSecret) data.webhook_secret_enc = encrypt(webhookSecret);

    const row = await prisma.school_payment_gateway.upsert({
      where: { school_id: id },
      update: data,
      create: { school_id: id, ...data },
    });
    const message = row.status === 'connected'
      ? 'Saved. The keys did not change, so online payments stay on.'
      : 'Saved. Run "Test keys" to switch on online payments.';
    return res.json(serializeBigInt({ message, gateway: shape(id, row) }));
  } catch (err) {
    if (err.code === 'PAYMENT_KEYS_SECRET_MISSING') return res.status(500).json({ error: err.message });
    if (tableMissing(err)) return res.status(501).json({ error: notSetUpMessage });
    console.error('Save school gateway error:', err.message);
    return res.status(500).json({ error: 'Failed to save the school payment account.' });
  }
};

const testSchoolGateway = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return res.status(400).json({ error: 'Invalid school id.' });
    const row = await prisma.school_payment_gateway.findUnique({ where: { school_id: id } });
    if (!row?.key_id || !row?.key_secret_enc) {
      return res.status(400).json({ error: 'Save the school\'s Key ID and Key Secret first.' });
    }

    let secret;
    try {
      secret = decrypt(row.key_secret_enc);
    } catch (e) {
      return res.status(500).json({ error: e.code === 'PAYMENT_KEYS_SECRET_MISSING' ? e.message : 'The saved secret cannot be read. Save the keys again.' });
    }

    let response;
    try {
      response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        headers: { Authorization: `Basic ${Buffer.from(`${row.key_id}:${secret}`).toString('base64')}` },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      return res.status(502).json({ error: 'Could not reach Razorpay. Try again in a minute.' });
    }

    const now = new Date();
    if (response.status === 401) {
      const saved = await prisma.school_payment_gateway.update({
        where: { school_id: id },
        data: { status: 'invalid_credentials', last_tested_at: now, last_error: 'Razorpay rejected these keys', connected_at: null },
      });
      return res.status(400).json(serializeBigInt({ error: 'Razorpay rejected these keys. Check the Key ID and Secret.', gateway: shape(id, saved) }));
    }
    if (!response.ok) {
      return res.status(502).json({ error: `Razorpay answered with status ${response.status}. Try again later.` });
    }

    const saved = await prisma.school_payment_gateway.update({
      where: { school_id: id },
      data: { status: 'connected', connected_at: now, last_tested_at: now, last_error: null, disconnected_at: null },
    });
    return res.json(serializeBigInt({
      message: `Connected. The school can now take ${row.mode === 'live' ? 'live' : 'test'} online payments.`,
      gateway: shape(id, saved),
    }));
  } catch (err) {
    if (tableMissing(err)) return res.status(501).json({ error: notSetUpMessage });
    console.error('Test school gateway error:', err.message);
    return res.status(500).json({ error: 'Failed to test the school payment account.' });
  }
};

const disconnectSchoolGateway = async (req, res) => {
  try {
    const id = parseSchoolId(req);
    if (!id) return res.status(400).json({ error: 'Invalid school id.' });
    const row = await prisma.school_payment_gateway.findUnique({ where: { school_id: id } });
    if (!row) return res.status(404).json({ error: 'This school has no payment account.' });
    const saved = await prisma.school_payment_gateway.update({
      where: { school_id: id },
      data: {
        status: 'disconnected',
        key_secret_enc: null,
        webhook_secret_enc: null,
        connected_at: null,
        disconnected_at: new Date(),
        updated_by: String(req.staffUser?.full_name || '').slice(0, 150) || null,
      },
    });
    return res.json(serializeBigInt({ message: 'Disconnected. The school cannot take online payments until new keys are saved and tested.', gateway: shape(id, saved) }));
  } catch (err) {
    if (tableMissing(err)) return res.status(501).json({ error: notSetUpMessage });
    console.error('Disconnect school gateway error:', err.message);
    return res.status(500).json({ error: 'Failed to disconnect the school payment account.' });
  }
};

/** Status per school for the schools list; empty when the table is missing. */
const gatewayStatusBySchool = async () => {
  try {
    const rows = await prisma.school_payment_gateway.findMany({ select: { school_id: true, status: true, mode: true } });
    return new Map(rows.map((r) => [String(r.school_id), { status: r.status, mode: r.mode }]));
  } catch {
    return new Map();
  }
};

module.exports = {
  getSchoolGateway,
  saveSchoolGateway,
  testSchoolGateway,
  disconnectSchoolGateway,
  gatewayStatusBySchool,
  webhookUrlFor,
};
