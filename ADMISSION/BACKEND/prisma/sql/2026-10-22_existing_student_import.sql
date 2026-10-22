-- Import of a school's EXISTING students (Admission → Import existing
-- students, and Super Admin → Schools → Import students).
-- Run in the Neon SQL editor BEFORE deploying the backends. Safe to run more
-- than once. No rows are changed or deleted.
--
-- 1. admission.class_id / section_id become optional, so a student whose
--    class is not decided yet can be imported ("Class pending") and given a
--    class later. Existing admissions all keep their class.
-- 2. Admission numbers become unique WITHIN a school instead of across all
--    schools, so two schools can both have a student "101". The per-school
--    rule is added first (existing data already satisfies it, because numbers
--    were unique across all schools), then the old all-schools rule is removed.
-- 3. New table student_import_batch: one row per import, listing the students
--    it created so a wrong import can be undone.
--
-- To reverse 2 later (only possible while no two schools share a number):
--   ALTER TABLE student ADD CONSTRAINT student_admission_number_key UNIQUE (admission_number);
-- To reverse 1 later (only possible while every admission has a class):
--   ALTER TABLE admission ALTER COLUMN class_id SET NOT NULL, ALTER COLUMN section_id SET NOT NULL;

BEGIN;

-- 1. Class and section optional on admission
ALTER TABLE admission ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE admission ALTER COLUMN section_id DROP NOT NULL;

-- 2a. Admission number unique per school
CREATE UNIQUE INDEX IF NOT EXISTS student_school_id_admission_number_key
  ON student (school_id, admission_number);

-- 2b. Remove the old rule that made admission numbers unique across all schools
--     (a UNIQUE constraint or unique index on admission_number alone, whatever
--     its name)
DO $$
DECLARE
  r record;
  col smallint;
BEGIN
  SELECT a.attnum INTO col
  FROM pg_attribute a
  WHERE a.attrelid = 'public.student'::regclass AND a.attname = 'admission_number';

  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.student'::regclass
      AND c.contype = 'u'
      AND c.conkey = ARRAY[col]
  LOOP
    EXECUTE format('ALTER TABLE public.student DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Removed constraint %', r.conname;
  END LOOP;

  FOR r IN
    SELECT i.relname
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    WHERE x.indrelid = 'public.student'::regclass
      AND x.indisunique
      AND x.indnatts = 1
      AND x.indkey[0] = col
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX public.%I', r.relname);
    RAISE NOTICE 'Removed unique index %', r.relname;
  END LOOP;
END $$;

-- 3. Import history (for undo)
CREATE TABLE IF NOT EXISTS student_import_batch (
  id                  BIGSERIAL PRIMARY KEY,
  school_id           BIGINT        NOT NULL REFERENCES school(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  file_name           VARCHAR(255),
  created_by          VARCHAR(150),
  created_at          TIMESTAMP(6)  NOT NULL DEFAULT now(),
  student_count       INTEGER       NOT NULL DEFAULT 0,
  class_pending_count INTEGER       NOT NULL DEFAULT 0,
  invoice_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  student_ids         JSONB         NOT NULL DEFAULT '[]'::jsonb,
  status              VARCHAR(20)   NOT NULL DEFAULT 'imported',
  undone_at           TIMESTAMP(6),
  undone_by           VARCHAR(150)
);
CREATE INDEX IF NOT EXISTS idx_student_import_batch_school_id ON student_import_batch (school_id);

COMMIT;

-- Checks (all three should say yes / 0)
SELECT
  (SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'admission' AND column_name = 'class_id') AS class_optional,
  (SELECT count(*) FROM pg_indexes
    WHERE tablename = 'student' AND indexname = 'student_school_id_admission_number_key') AS per_school_rule,
  (SELECT count(*) FROM student_import_batch) AS imports_so_far;
