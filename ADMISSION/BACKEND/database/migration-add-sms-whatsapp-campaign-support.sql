-- Migration: Add SMS/WhatsApp/Campaign support fields and indexes
-- Safe to run multiple times.
ALTER TABLE campaign
ADD COLUMN IF NOT EXISTS audience_type VARCHAR(50) CHECK (audience_type IN ('lead', 'student', 'parent'));
ALTER TABLE communication_log
ADD COLUMN IF NOT EXISTS campaign_id BIGINT REFERENCES campaign(id) ON DELETE
SET NULL;
CREATE INDEX IF NOT EXISTS idx_comm_channel ON communication_log(channel);
CREATE INDEX IF NOT EXISTS idx_comm_school ON communication_log(school_id);
CREATE INDEX IF NOT EXISTS idx_comm_school_channel_sent_at ON communication_log(school_id, channel, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_campaign_id ON communication_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_school_created ON campaign(school_id, created_at DESC);