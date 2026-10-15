-- Each school's own email account (Super Admin → Schools → Communication).
-- Additive only: creates one new table. Nothing existing is changed.
-- Safe to run more than once. Run in the Neon SQL editor BEFORE deploying.
--
-- Secrets (API key, SMTP password) are stored encrypted with the
-- PAYMENT_KEYS_SECRET server setting, which must have the same value on the
-- Super Admin, Lead and Admission backends.

CREATE TABLE IF NOT EXISTS school_communication_settings (
  id                   BIGSERIAL PRIMARY KEY,
  school_id            BIGINT       NOT NULL REFERENCES school(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  email_provider       VARCHAR(20),
  email_from_name      VARCHAR(150),
  email_from_address   VARCHAR(150),
  email_reply_to       VARCHAR(150),
  email_api_key_enc    TEXT,
  smtp_host            VARCHAR(150),
  smtp_port            INTEGER,
  smtp_secure          BOOLEAN,
  smtp_user            VARCHAR(150),
  smtp_pass_enc        TEXT,
  email_status         VARCHAR(30)  NOT NULL DEFAULT 'not_configured',
  email_last_tested_at TIMESTAMP(6),
  email_last_error     TEXT,
  updated_by           VARCHAR(150),
  created_at           TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_communication_settings_school_id_key
  ON school_communication_settings (school_id);

-- Check: the table exists and is empty until a school is set up
SELECT count(*) AS schools_set_up FROM school_communication_settings;
