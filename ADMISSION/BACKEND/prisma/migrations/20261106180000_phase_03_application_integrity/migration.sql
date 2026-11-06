-- Phase 3: enforce the existing business rule that a school/lead can have
-- at most one submitted application. Draft and in-progress applications remain
-- allowed so schools can work on multiple drafts before submission.
--
-- Do not silently discard or rewrite historical application records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "application"
    WHERE "lead_id" IS NOT NULL
      AND "status" = 'submitted'
    GROUP BY "school_id", "lead_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create unique submitted-application index: duplicate submitted applications exist for one or more school/lead pairs. Reconcile these records before retrying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_application_one_submitted_per_school_lead"
ON "application" ("school_id", "lead_id")
WHERE "lead_id" IS NOT NULL AND "status" = 'submitted';
