-- Migration: Add document_number column to application_documents table
-- Purpose: Allow storing document reference numbers in addition to file uploads
-- Date: 2026-04-27

ALTER TABLE application_documents
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(255);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_application_documents_document_number 
  ON application_documents(document_number);

-- Add comment for clarity
COMMENT ON COLUMN application_documents.document_number IS 
  'Optional document reference number (e.g., roll number, registration number, etc.)';
