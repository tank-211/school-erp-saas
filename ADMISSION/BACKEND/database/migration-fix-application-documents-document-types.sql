-- Normalize and repair application_documents constraints.
-- Safe to run multiple times.

BEGIN;

-- Ensure columns needed by current save flow exist.
ALTER TABLE application_documents
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS uploaded_by BIGINT,
  ADD COLUMN IF NOT EXISTS verified_by BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Remove duplicate rows before recreating unique constraint.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY application_id, document_type
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM application_documents
)
DELETE FROM application_documents d
USING ranked r
WHERE d.id = r.id
  AND r.rn > 1;

-- Drop duplicate and legacy constraints.
ALTER TABLE application_documents
  DROP CONSTRAINT IF EXISTS unique_application_documents,
  DROP CONSTRAINT IF EXISTS unique_application_documents_application,
  DROP CONSTRAINT IF EXISTS unique_application_documents_application_document_type,
  DROP CONSTRAINT IF EXISTS application_documents_application_id_fkey,
  DROP CONSTRAINT IF EXISTS application_documents_uploaded_by_fkey,
  DROP CONSTRAINT IF EXISTS application_documents_verified_by_fkey,
  DROP CONSTRAINT IF EXISTS fk_app_docs_app,
  DROP CONSTRAINT IF EXISTS fk_app_docs_uploaded,
  DROP CONSTRAINT IF EXISTS fk_app_docs_verified,
  DROP CONSTRAINT IF EXISTS application_documents_document_type_check,
  DROP CONSTRAINT IF EXISTS check_document_type;

-- Recreate canonical constraints.
ALTER TABLE application_documents
  ADD CONSTRAINT application_documents_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
  ADD CONSTRAINT application_documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES app_user(id) ON DELETE SET NULL,
  ADD CONSTRAINT application_documents_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES app_user(id) ON DELETE SET NULL,
  ADD CONSTRAINT application_documents_document_type_check
    CHECK (
      document_type IN (
        'birth_certificate',
        'aadhaar_card',
        'passport_photos',
        'transfer_certificate',
        'previous_report_card',
        'address_proof',
        'parent_id_proof',
        'student_photo',
        'previous_marksheet',
        'aadhar_card',
        'father_id_proof',
        'mother_id_proof',
        'other'
      )
    ),
  ADD CONSTRAINT unique_app_id_and_type UNIQUE (application_id, document_type);

COMMIT;
