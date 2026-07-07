-- Migration: Add email communication indexes for performance
CREATE INDEX IF NOT EXISTS idx_communication_log_school_channel ON communication_log(school_id, channel);
CREATE INDEX IF NOT EXISTS idx_communication_log_sent_at ON communication_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_log_recipient_type ON communication_log(school_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_message_template_school_id ON message_template(school_id);