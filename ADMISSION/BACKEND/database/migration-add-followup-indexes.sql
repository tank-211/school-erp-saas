-- Migration: Add indexes for upcoming follow-ups optimization
-- Purpose: Optimize queries for the "Upcoming Follow-ups" widget in Admissions Dashboard
-- 
-- This migration adds a composite index on the lead table to:
-- 1. Filter by school_id (multi-tenant isolation)
-- 2. Filter by follow_up_status (pending, contacted, interested)
-- 3. Filter by last_contacted_at (non-null values)
-- 
-- Expected index usage in query:
-- SELECT ... FROM lead WHERE school_id = X AND follow_up_status IN (...) AND last_contacted_at IS NOT NULL
-- Create the composite index for upcoming follow-ups query
CREATE INDEX IF NOT EXISTS idx_lead_followup_upcoming ON lead(
  school_id,
  follow_up_status,
  last_contacted_at DESC
)
WHERE last_contacted_at IS NOT NULL;
-- Additional index to support filtering by assigned_to for team-based views
CREATE INDEX IF NOT EXISTS idx_lead_assigned_to ON lead(school_id, assigned_to, follow_up_status)
WHERE last_contacted_at IS NOT NULL;
-- Alternative simple index if composite doesn't perform well
CREATE INDEX IF NOT EXISTS idx_lead_contactdate ON lead(last_contacted_at DESC)
WHERE school_id IS NOT NULL
  AND follow_up_status IN ('pending', 'contacted', 'interested');
-- Index to support sorting by last_contacted_at for various queries
CREATE INDEX IF NOT EXISTS idx_lead_school_status_date ON lead(
  school_id,
  follow_up_status,
  last_contacted_at DESC
);