-- Guard payment transaction identifiers against duplicate capture/webhook writes.
-- Refuse to apply if historical non-empty transaction IDs are already duplicated;
-- those financial records must be reconciled manually, never silently deleted.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "payment"
    WHERE "transaction_id" IS NOT NULL
      AND btrim("transaction_id") <> ''
    GROUP BY "school_id", "transaction_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payment transaction IDs exist; reconcile them before applying phase-01 financial integrity migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_school_transaction_id_key"
  ON "payment" ("school_id", "transaction_id")
  WHERE "transaction_id" IS NOT NULL AND btrim("transaction_id") <> '';
