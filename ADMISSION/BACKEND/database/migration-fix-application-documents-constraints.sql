-- Repair application_documents so ON CONFLICT (application_id) works reliably.
-- Run this on existing databases before deploying the documents API fix.
BEGIN;
-- 1) Remove duplicate rows while keeping the newest row per application_id.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY application_id
      ORDER BY updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM application_documents
)
DELETE FROM application_documents d USING ranked r
WHERE d.id = r.id
  AND r.rn > 1;
-- 2) Add the exact unique constraint required by the UPSERT.
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'unique_application_documents_application'
    AND conrelid = 'application_documents'::regclass
) THEN
ALTER TABLE application_documents
ADD CONSTRAINT unique_application_documents_application UNIQUE (application_id);
END IF;
END $$;
COMMIT;