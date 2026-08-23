-- Ensure application flow supports manual entry and non-unique parent contacts.
BEGIN;
-- 1) Manual-entry applications require nullable lead_id.
ALTER TABLE application
ALTER COLUMN lead_id DROP NOT NULL;
-- 2) Remove accidental unique constraints/indexes on parent contact fields if they exist.
DO $$
DECLARE rec RECORD;
BEGIN FOR rec IN
SELECT c.conname
FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'application_parent_info'
  AND c.contype = 'u'
  AND (
    pg_get_constraintdef(c.oid) ILIKE '%father_email%'
    OR pg_get_constraintdef(c.oid) ILIKE '%mother_email%'
    OR pg_get_constraintdef(c.oid) ILIKE '%father_phone%'
    OR pg_get_constraintdef(c.oid) ILIKE '%mother_phone%'
    OR pg_get_constraintdef(c.oid) ILIKE '%primary_contact_phone%'
  ) LOOP EXECUTE format(
    'ALTER TABLE application_parent_info DROP CONSTRAINT %I',
    rec.conname
  );
END LOOP;
END $$;
DO $$
DECLARE rec RECORD;
BEGIN FOR rec IN
SELECT indexname
FROM pg_indexes
WHERE tablename = 'application_parent_info'
  AND indexdef ILIKE '%UNIQUE%'
  AND (
    indexdef ILIKE '%father_email%'
    OR indexdef ILIKE '%mother_email%'
    OR indexdef ILIKE '%father_phone%'
    OR indexdef ILIKE '%mother_phone%'
    OR indexdef ILIKE '%primary_contact_phone%'
  ) LOOP EXECUTE format('DROP INDEX IF EXISTS %I', rec.indexname);
END LOOP;
END $$;
-- 3) Keep exactly one parent row per application (standard constraint name).
DO $$
DECLARE rec RECORD;
BEGIN FOR rec IN
SELECT c.conname
FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid
  AND a.attnum = ANY(c.conkey)
WHERE c.conrelid = 'application_parent_info'::regclass
  AND c.contype = 'u'
  AND a.attname = 'application_id'
  AND c.conname <> 'unique_application_parent' LOOP EXECUTE format(
    'ALTER TABLE application_parent_info DROP CONSTRAINT %I',
    rec.conname
  );
END LOOP;
IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'unique_application_parent'
    AND conrelid = 'application_parent_info'::regclass
) THEN
ALTER TABLE application_parent_info
ADD CONSTRAINT unique_application_parent UNIQUE (application_id);
END IF;
END $$;
COMMIT;