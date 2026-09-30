-- Admission completion columns (additive, safe to run more than once).
--
-- The Admission app marks an admission complete with admission.is_completed
-- and tracks the form step in admission.current_step
-- (database/migration-admission-resume-workflow.sql). The production database
-- did not have them, so completing an admission and "Fees & Payments" failed.
--
-- Existing admissions: 'active' / 'completed' ones are the finished admissions
-- from before this column existed, so they are marked complete. Drafts
-- ('in_progress', 'draft', 'submitted') and withdrawn/suspended ones stay
-- incomplete, so they are not billed.

ALTER TABLE admission ADD COLUMN IF NOT EXISTS current_step VARCHAR(30) DEFAULT 'student';
ALTER TABLE admission ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE admission
SET is_completed = TRUE
WHERE is_completed = FALSE
  AND status IN ('active', 'completed');

-- Check: how many admissions per status are now complete
SELECT status, is_completed, count(*) FROM admission GROUP BY 1, 2 ORDER BY 1, 2;
