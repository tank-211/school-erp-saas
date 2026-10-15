-- Each school's own email, SMS and WhatsApp accounts
-- (Super Admin → Schools → Communication).
-- Additive only: creates one new table (or adds columns to it if an earlier
-- version of this file was already run). Nothing existing is changed.
-- Safe to run more than once. Run in the Neon SQL editor BEFORE deploying.
--
-- Secrets (API key, SMTP password) are stored encrypted with the
-- PAYMENT_KEYS_SECRET server setting, which must have the same value on the
-- Super Admin, Lead, Admission and Fees backends.

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
  sms_provider         VARCHAR(20),
  sms_api_key_enc      TEXT,
  sms_account_sid      VARCHAR(100),
  sms_sender           VARCHAR(100),
  sms_template_id      VARCHAR(100),
  sms_template_var     VARCHAR(50),
  sms_status           VARCHAR(30)  NOT NULL DEFAULT 'not_configured',
  sms_last_tested_at   TIMESTAMP(6),
  sms_last_error       TEXT,
  whatsapp_provider    VARCHAR(20),
  whatsapp_token_enc   TEXT,
  whatsapp_account_sid VARCHAR(100),
  whatsapp_sender      VARCHAR(100),
  whatsapp_template    VARCHAR(150),
  whatsapp_template_lang VARCHAR(20),
  whatsapp_status      VARCHAR(30)  NOT NULL DEFAULT 'not_configured',
  whatsapp_last_tested_at TIMESTAMP(6),
  whatsapp_last_error  TEXT,
  updated_by           VARCHAR(150),
  created_at           TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_communication_settings_school_id_key
  ON school_communication_settings (school_id);

-- If the email-only version of this file was run before, add the SMS and
-- WhatsApp columns (does nothing when they already exist)
ALTER TABLE school_communication_settings
  ADD COLUMN IF NOT EXISTS sms_provider         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sms_api_key_enc      TEXT,
  ADD COLUMN IF NOT EXISTS sms_account_sid      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sms_sender           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sms_template_id      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sms_template_var     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sms_status           VARCHAR(30) NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS sms_last_tested_at   TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS sms_last_error       TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_provider    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS whatsapp_token_enc   TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_account_sid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS whatsapp_sender      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS whatsapp_template    VARCHAR(150),
  ADD COLUMN IF NOT EXISTS whatsapp_template_lang VARCHAR(20),
  ADD COLUMN IF NOT EXISTS whatsapp_status      VARCHAR(30) NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS whatsapp_last_tested_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS whatsapp_last_error  TEXT;

-- Check: the table exists and is empty until a school is set up
SELECT count(*) AS schools_set_up,
       count(*) FILTER (WHERE sms_status = 'connected') AS sms_working,
       count(*) FILTER (WHERE whatsapp_status = 'connected') AS whatsapp_working
FROM school_communication_settings;
