-- FEES refunds: adds ONE new table, refund_request.
-- Additive only: no existing table, column or row is changed or removed.
-- Safe to run more than once (IF NOT EXISTS).
-- Run once in the Neon SQL editor. Refunds switch on in the Fees app within
-- a minute, with no redeploy.
--
-- To undo (only if no refunds have been recorded yet):
--   DROP TABLE refund_request;

CREATE TABLE IF NOT EXISTS refund_request (
  id               BIGSERIAL PRIMARY KEY,
  school_id        BIGINT        NOT NULL REFERENCES school(id)  ON DELETE CASCADE ON UPDATE NO ACTION,
  student_id       BIGINT        NOT NULL REFERENCES student(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  payment_id       BIGINT        NOT NULL REFERENCES payment(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason           TEXT          NOT NULL,
  description      TEXT,
  status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  approved_by      VARCHAR(100),
  approval_date    TIMESTAMP(6),
  rejection_reason TEXT,
  notes            TEXT,
  processed_date   TIMESTAMP(6),
  refund_method    VARCHAR(50),
  refund_reference VARCHAR(100),
  account_holder   VARCHAR(150),
  account_last4    VARCHAR(4),
  ifsc_code        VARCHAR(20),
  created_at       TIMESTAMP(6)  DEFAULT now(),
  updated_at       TIMESTAMP(6)  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_request_school_id  ON refund_request (school_id);
CREATE INDEX IF NOT EXISTS idx_refund_request_student_id ON refund_request (student_id);
CREATE INDEX IF NOT EXISTS idx_refund_request_payment_id ON refund_request (payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_request_status     ON refund_request (status);
