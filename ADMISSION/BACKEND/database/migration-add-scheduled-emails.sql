-- Migration: Add scheduled email support for communication module

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id BIGINT NOT NULL,
  recipients TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  scheduled_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduled_emails
ADD COLUMN IF NOT EXISTS recipient_type TEXT;

ALTER TABLE scheduled_emails
ADD COLUMN IF NOT EXISTS recipient_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_due ON scheduled_emails (status, scheduled_at);

CREATE TABLE IF NOT EXISTS communication_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    recipient_type TEXT,
    recipient_id BIGINT,
    recipient_email TEXT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_sent_at ON communication_logs (sent_at DESC);