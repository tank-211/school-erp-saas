-- Fix UPSERT conflict target errors for application child tables.
-- Ensures one row per application_id, removes duplicates (keeps latest), and adds named unique constraints.
BEGIN;
-- 1) Identify duplicates before cleanup.
SELECT 'application_student_info' AS table_name,
  application_id,
  COUNT(*) AS duplicate_count
FROM application_student_info
GROUP BY application_id
HAVING COUNT(*) > 1;
SELECT 'application_parent_info' AS table_name,
  application_id,
  COUNT(*) AS duplicate_count
FROM application_parent_info
GROUP BY application_id
HAVING COUNT(*) > 1;
SELECT 'application_academic_info' AS table_name,
  application_id,
  COUNT(*) AS duplicate_count
FROM application_academic_info
GROUP BY application_id
HAVING COUNT(*) > 1;
SELECT 'application_documents' AS table_name,
  application_id,
  COUNT(*) AS duplicate_count
FROM application_documents
GROUP BY application_id
HAVING COUNT(*) > 1;
-- 2) Remove duplicates while keeping the latest row per application_id.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY application_id
      ORDER BY updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM application_student_info
)
DELETE FROM application_student_info t USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY application_id
      ORDER BY updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM application_parent_info
)
DELETE FROM application_parent_info t USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY application_id
      ORDER BY updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM application_academic_info
)
DELETE FROM application_academic_info t USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;
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
DELETE FROM application_documents t USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;
-- 3) Drop any existing unique constraints on application_id so we can enforce standard names.
DO $$
DECLARE rec RECORD;
BEGIN FOR rec IN
SELECT c.conrelid::regclass AS table_name,
  c.conname
FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid
  AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'u'
  AND a.attname = 'application_id'
  AND c.conrelid IN (
    'application_student_info'::regclass,
    'application_parent_info'::regclass,
    'application_academic_info'::regclass,
    'application_documents'::regclass
  ) LOOP EXECUTE format(
    'ALTER TABLE %s DROP CONSTRAINT %I',
    rec.table_name,
    rec.conname
  );
END LOOP;
END $$;
-- 4) Add required named unique constraints.
ALTER TABLE application_student_info
ADD CONSTRAINT unique_application_student_info_application UNIQUE (application_id);
ALTER TABLE application_parent_info
ADD CONSTRAINT unique_application_parent_info_application UNIQUE (application_id);
ALTER TABLE application_academic_info
ADD CONSTRAINT unique_application_academic_info_application UNIQUE (application_id);
ALTER TABLE application_documents
ADD CONSTRAINT unique_application_documents_application UNIQUE (application_id);
COMMIT;