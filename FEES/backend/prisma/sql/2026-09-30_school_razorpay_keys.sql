-- Per-school Razorpay accounts (Super Admin enters each school's API keys).
-- Additive only: creates school_payment_gateway if it does not exist yet, adds
-- new columns, and a duplicate guard for online payments. Nothing existing is
-- changed or removed. Safe to run more than once.
-- Run once in the Neon SQL editor BEFORE deploying the matching code.

CREATE TABLE IF NOT EXISTS school_payment_gateway (
  id                  BIGSERIAL PRIMARY KEY,
  school_id           BIGINT       NOT NULL REFERENCES school(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  provider            VARCHAR(50)  NOT NULL DEFAULT 'razorpay',
  status              VARCHAR(50)  NOT NULL DEFAULT 'not_connected',
  razorpay_account_id VARCHAR(100),
  access_token        TEXT,
  refresh_token       TEXT,
  connected_at        TIMESTAMP(6),
  disconnected_at     TIMESTAMP(6),
  created_at          TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS school_payment_gateway_school_id_key ON school_payment_gateway (school_id);
CREATE INDEX IF NOT EXISTS school_payment_gateway_provider_idx ON school_payment_gateway (provider);
CREATE INDEX IF NOT EXISTS school_payment_gateway_status_idx ON school_payment_gateway (status);

-- The school's own Razorpay API keys. Secrets are stored encrypted by the app
-- (AES-256-GCM with the PAYMENT_KEYS_SECRET server setting), never in plain text.
ALTER TABLE school_payment_gateway ADD COLUMN IF NOT EXISTS key_id             VARCHAR(100);
ALTER TABLE school_payment_gateway ADD COLUMN IF NOT EXISTS key_secret_enc     TEXT;
ALTER TABLE school_payment_gateway ADD COLUMN IF NOT EXISTS webhook_secret_enc TEXT;
ALTER TABLE school_payment_gateway ADD COLUMN IF NOT EXISTS mode               VARCHAR(10);
ALTER TABLE school_payment_gateway ADD COLUMN IF NOT EXISTS last_tested_at     TIMESTAMP(6);
ALTER TABLE school_payment_gateway ADD COLUMN IF NOT EXISTS last_error         TEXT;
ALTER TABLE school_payment_gateway ADD COLUMN IF NOT EXISTS updated_by         VARCHAR(150);

-- One recorded payment per Razorpay payment id (the browser confirmation and
-- the webhook can arrive at the same moment). Created only if no duplicates
-- exist already; otherwise it prints a notice and the app's own check applies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM payment
    WHERE payment_method = 'online' AND transaction_id IS NOT NULL
    GROUP BY school_id, transaction_id HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_online_txn
      ON payment (school_id, transaction_id)
      WHERE payment_method = 'online' AND transaction_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Duplicate online payments exist; unique index not created';
  END IF;
END $$;
