-- 0076_npd_archived — add archive flag to NPD products (additive, idempotent).
-- Archiving hides a product from the active board without deleting its tasks
-- (no data loss); delete is a separate explicit action.
ALTER TABLE npd_products ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS npd_products_archived_idx ON npd_products (archived, sr_no);
