-- Admission resume workflow migration
-- Run: psql -U <user> -d <db> -f backend/database/migration-admission-resume-workflow.sql
BEGIN;
-- 1) Add status/current_step/is_completed to admission for resume flow
ALTER TABLE admission
ADD COLUMN IF NOT EXISTS current_step VARCHAR(30) DEFAULT 'student';
ALTER TABLE admission
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
-- Expand status support while keeping backward compatibility
ALTER TABLE admission DROP CONSTRAINT IF EXISTS admission_status_check;
ALTER TABLE admission
ADD CONSTRAINT admission_status_check CHECK (
    status IN (
      'active',
      'on-leave',
      'suspended',
      'withdrawn',
      'draft',
      'submitted',
      'in_progress',
      'completed'
    )
  );
-- 2) Add admission_id linkage for true upsert-by-admission flow
ALTER TABLE student
ADD COLUMN IF NOT EXISTS admission_id BIGINT;
ALTER TABLE parent_detail
ADD COLUMN IF NOT EXISTS admission_id BIGINT;
ALTER TABLE student DROP CONSTRAINT IF EXISTS student_admission_id_fkey;
ALTER TABLE student
ADD CONSTRAINT student_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES admission(id) ON DELETE
SET NULL;
ALTER TABLE parent_detail DROP CONSTRAINT IF EXISTS parent_detail_admission_id_fkey;
ALTER TABLE parent_detail
ADD CONSTRAINT parent_detail_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES admission(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_admission_id ON student(admission_id)
WHERE admission_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_detail_admission_id ON parent_detail(admission_id)
WHERE admission_id IS NOT NULL;
-- 3) Academic table for step data (1 row per admission)
CREATE TABLE IF NOT EXISTS academic (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  admission_id BIGINT NOT NULL UNIQUE REFERENCES admission(id) ON DELETE CASCADE,
  previous_school VARCHAR(255),
  last_class_studied VARCHAR(100),
  main_subject VARCHAR(100),
  percentage DECIMAL(5, 2),
  strengths TEXT,
  areas_to_improve TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_academic_school_id ON academic(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_admission_id ON academic(admission_id);
-- 4) Photo table (1 row per admission)
CREATE TABLE IF NOT EXISTS student_photos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  admission_id BIGINT NOT NULL UNIQUE REFERENCES admission(id) ON DELETE CASCADE,
  student_photo TEXT,
  passport_photos TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_student_photos_school_id ON student_photos(school_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_admission_id ON student_photos(admission_id);
-- 5) Documents table (1 row per admission)
CREATE TABLE IF NOT EXISTS student_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  admission_id BIGINT NOT NULL UNIQUE REFERENCES admission(id) ON DELETE CASCADE,
  birth_certificate TEXT,
  aadhaar_card TEXT,
  passport_photos TEXT,
  transfer_certificate TEXT,
  previous_report_card TEXT,
  address_proof TEXT,
  parent_id_proof TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_student_documents_school_id ON student_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_admission_id ON student_documents(admission_id);
COMMIT;