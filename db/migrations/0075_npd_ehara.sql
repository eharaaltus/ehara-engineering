-- Ehara NPD (New Product Development) module — 6-stage / 36-activity tracker.
DO $$ BEGIN
  CREATE TYPE "npd_stage" AS ENUM (
    'TECHNICAL','COMMERCIAL','TOOL DEVELOPMENT','PART SUBMISSION',
    'PPAP & PTR DOCUMENT','PRE PRODUCTION HANDOVER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "npd_resolution" AS ENUM ('Open','Done','On Hold');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "npd_applicability" AS ENUM ('Applicable','N/A','On Hold');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "npd_product_status" AS ENUM ('Active','On Hold','Completed','Cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "npd_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sr_no" integer,
  "customer" text,
  "part_name" text NOT NULL,
  "part_no" text,
  "start_date" date,
  "target_end_date" date,
  "default_doer_id" uuid REFERENCES "employees"("id") ON DELETE SET NULL,
  "default_supervisor_id" uuid REFERENCES "employees"("id") ON DELETE SET NULL,
  "status" "npd_product_status" NOT NULL DEFAULT 'Active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "npd_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "npd_products"("id") ON DELETE CASCADE,
  "stage" "npd_stage" NOT NULL,
  "code" text NOT NULL,
  "activity_plan" text NOT NULL,
  "doer_id" uuid REFERENCES "employees"("id") ON DELETE SET NULL,
  "supervisor_id" uuid REFERENCES "employees"("id") ON DELETE SET NULL,
  "planned_date" date,
  "resolution" "npd_resolution" NOT NULL DEFAULT 'Open',
  "completion_date" date,
  "drawing_link" text,
  "applicability" "npd_applicability" NOT NULL DEFAULT 'Applicable',
  "reasons" text,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "npd_tasks_product_idx" ON "npd_tasks" ("product_id");
