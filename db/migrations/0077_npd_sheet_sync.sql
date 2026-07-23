-- 0077 — NPD: frozen baselines + Google-Sheet two-way mirror.
--
-- Two independent things land here:
--
--  1. BASELINES. `npd_products.baseline_end_date` and `npd_tasks.baseline_date`
--     freeze the plan as it was originally committed. `planned_date` /
--     `target_end_date` stay editable. The gap between them is slip — which,
--     until now, was permanently unknowable: re-planning overwrote the only
--     record of what we'd promised, so a product could be re-dated five times
--     and every report would still say "on track". Existing rows are
--     back-filled from their current dates, which is the honest default: we
--     genuinely don't know what those were originally planned for, so their
--     slip reads 0 rather than a fabricated number.
--
--  2. THE MIRROR. `updated_at` / `updated_source` let sheet-vs-app edits be
--     resolved last-write-wins and stop echo loops; `npd_sync_log` is the audit
--     trail the NPD page reads to show "Sheet synced 2 min ago".
--
-- Written defensively (IF NOT EXISTS everywhere) per this repo's convention —
-- apply-all-migrations.ts re-runs every file on every invocation.

-- ── enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "npd_sync_source" AS ENUM ('app', 'sheet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "npd_sync_direction" AS ENUM ('push', 'pull', 'hook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── npd_products ───────────────────────────────────────────────────────────
ALTER TABLE "npd_products" ADD COLUMN IF NOT EXISTS "baseline_end_date" date;
ALTER TABLE "npd_products" ADD COLUMN IF NOT EXISTS "updated_source" "npd_sync_source" DEFAULT 'app' NOT NULL;

-- Back-fill: today's target becomes the baseline for products that predate it.
UPDATE "npd_products"
   SET "baseline_end_date" = "target_end_date"
 WHERE "baseline_end_date" IS NULL
   AND "target_end_date" IS NOT NULL;

-- ── npd_tasks ──────────────────────────────────────────────────────────────
ALTER TABLE "npd_tasks" ADD COLUMN IF NOT EXISTS "baseline_date" date;
ALTER TABLE "npd_tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "npd_tasks" ADD COLUMN IF NOT EXISTS "updated_source" "npd_sync_source" DEFAULT 'app' NOT NULL;

UPDATE "npd_tasks"
   SET "baseline_date" = "planned_date"
 WHERE "baseline_date" IS NULL
   AND "planned_date" IS NOT NULL;

-- ── npd_sync_log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "npd_sync_log" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "direction"       "npd_sync_direction" NOT NULL,
  "ok"              boolean DEFAULT true NOT NULL,
  "products_pushed" integer DEFAULT 0 NOT NULL,
  "tasks_pushed"    integer DEFAULT 0 NOT NULL,
  "rows_applied"    integer DEFAULT 0 NOT NULL,
  "rows_skipped"    integer DEFAULT 0 NOT NULL,
  "error"           text,
  "duration_ms"     integer,
  "triggered_by_id" uuid,
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "npd_sync_log"
    ADD CONSTRAINT "npd_sync_log_triggered_by_id_employees_id_fk"
    FOREIGN KEY ("triggered_by_id") REFERENCES "employees"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "npd_sync_log_created_idx" ON "npd_sync_log" ("created_at");
