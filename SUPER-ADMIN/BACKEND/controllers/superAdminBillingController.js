const pool = require('../config/db');

const getTableColumns = async (client, tableName) => {
  const result = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName]
  );

  return new Set(result.rows.map((row) => row.column_name));
};

const ensureRenewalTable = async (client = pool) => {
  await client.query(
    `CREATE TABLE IF NOT EXISTS school_subscription_renewal (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
      amount DECIMAL(12, 2),
      currency VARCHAR(10) DEFAULT 'INR',
      period_months INT NOT NULL CHECK (period_months > 0),
      paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
      new_expiry_date DATE NOT NULL,
      notes TEXT,
      created_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_school_subscription_renewal_school_id
     ON school_subscription_renewal (school_id)`
  );
};

const renewSchoolSubscription = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { amount, currency, period_months, paid_on, notes, reactivate_school } = req.body;
    const renewalMonths = Number(period_months);
    const renewalAmount = amount === undefined || amount === null || amount === ''
      ? null
      : Number(amount);

    if (!Number.isInteger(renewalMonths) || renewalMonths <= 0) {
      return res.status(400).json({ error: 'period_months must be greater than 0.' });
    }
    if (renewalAmount !== null && Number.isNaN(renewalAmount)) {
      return res.status(400).json({ error: 'amount must be a valid number.' });
    }

    await client.query('BEGIN');
    await ensureRenewalTable(client);

    const schoolColumns = await getTableColumns(client, 'school');
    const schoolSelectColumns = ['id'];

    if (schoolColumns.has('expiry_date')) {
      schoolSelectColumns.push('expiry_date');
    }
    if (schoolColumns.has('is_active')) {
      schoolSelectColumns.push('is_active');
    }

    const schoolResult = await client.query(
      `SELECT ${schoolSelectColumns.join(', ')} FROM school WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (schoolResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'School not found.' });
    }

    const nextExpiryResult = await client.query(
      `SELECT (
         GREATEST(COALESCE($1::date, CURRENT_DATE), CURRENT_DATE)
         + ($2::int * INTERVAL '1 month')
       )::date AS next_expiry_date`,
      [schoolResult.rows[0].expiry_date, renewalMonths]
    );

    const nextExpiryDate = nextExpiryResult.rows[0].next_expiry_date;
    const paidOn = paid_on || new Date().toISOString().slice(0, 10);

    const renewalResult = await client.query(
      `INSERT INTO school_subscription_renewal (
         school_id, amount, currency, period_months, paid_on,
         new_expiry_date, notes, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, school_id, amount, currency, period_months, paid_on, new_expiry_date, notes, created_at`,
      [
        id,
        renewalAmount,
        currency ? String(currency).trim().toUpperCase() : 'INR',
        renewalMonths,
        paidOn,
        nextExpiryDate,
        notes || null,
        req.staffUser.full_name,
      ]
    );

    const shouldReactivate = reactivate_school === true || reactivate_school === 'true';
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (schoolColumns.has('expiry_date')) {
      updateFields.push(`expiry_date = $${paramIndex++}`);
      updateValues.push(nextExpiryDate);
    }
    if (shouldReactivate && schoolColumns.has('is_active')) {
      updateFields.push(`is_active = TRUE`);
    }
    if (shouldReactivate && schoolColumns.has('status')) {
      updateFields.push(`status = 'active'`);
    }
    if (schoolColumns.has('updated_at')) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
    }
    if (schoolColumns.has('updated_by')) {
      updateFields.push(`updated_by = $${paramIndex++}`);
      updateValues.push(req.staffUser.full_name);
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'School table is missing subscription columns.' });
    }

    updateValues.push(id);

    const returningColumns = ['id', 'name']
      .filter((column) => schoolColumns.has(column))
      .concat(
        ['is_active', 'status', 'expiry_date', 'plan_type'].filter((column) => schoolColumns.has(column))
      );

    const schoolUpdateResult = await client.query(
      `UPDATE school
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING ${returningColumns.join(', ')}`,
      updateValues
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'School subscription renewed successfully.',
      renewal: renewalResult.rows[0],
      school: schoolUpdateResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Renew school error:', err);
    return res.status(500).json({ error: 'Failed to renew school subscription.' });
  } finally {
    client.release();
  }
};

const getSchoolRenewals = async (req, res) => {
  try {
    const { id } = req.params;

    await ensureRenewalTable();

    const result = await pool.query(
      `SELECT id, school_id, amount, currency, period_months, paid_on,
              new_expiry_date, notes, created_by, created_at
       FROM school_subscription_renewal
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    return res.json({ renewals: result.rows });
  } catch (err) {
    console.error('Get renewals error:', err);
    return res.status(500).json({ error: 'Failed to fetch renewal history.' });
  }
};

module.exports = { renewSchoolSubscription, getSchoolRenewals };
