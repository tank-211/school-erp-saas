ALTER TABLE "task"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "related_entity_type" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "related_entity_id" BIGINT;

CREATE INDEX IF NOT EXISTS "idx_task_school_status_due"
  ON "task" ("school_id", "status", "due_date");
CREATE INDEX IF NOT EXISTS "idx_task_related_entity"
  ON "task" ("school_id", "related_entity_type", "related_entity_id");
