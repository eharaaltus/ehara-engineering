-- AA-Tech Production System — 3 new workflow modules:
--   sales_so  → SO Status
--   sales_ga  → GA Approval Status
--   sales_wo  → Work Order Status
-- Mirrors the sales_quotes / sales_bom pattern: uuid PK, generated Sr No,
-- every business column nullable, created_at / updated_at timestamps.

-- ── SO Status ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_so (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no                       integer GENERATED ALWAYS AS IDENTITY,
  enquiry_no                  text,
  po_no                       text,
  po_date                     date,
  company_name                text,
  po_link                     text,
  person_name                 text,
  cell_no                     text,
  email                       text,
  description                 text,
  item_name_code              text,
  unit_of_measure             text,
  qty                         numeric,
  rate                        numeric,
  amount_wo_gst               numeric,
  scope                       text,
  our_so_no                   text,
  so_date                     date,
  so_checklist_link           text,
  product_specification_link  text,
  so_drawing_no               text,
  so_amendment_needed         boolean NOT NULL DEFAULT false,
  so_amendment_reasons        text,
  amendment_date              date,
  amendment_related_notes     text,
  target_dispatch_date        date,
  actual_dispatch_date        date,
  days_to_produce             integer,
  actual_no_of_days           integer,
  no_of_days_delay            integer,
  ga_approval_needed          boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_so_enquiry_idx ON sales_so (enquiry_no);

-- ── GA Approval Status ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_ga (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no                       integer GENERATED ALWAYS AS IDENTITY,
  our_so_no                   text,
  so_date                     date,
  po_no                       text,
  company_name                text,
  so_checklist_link           text,
  product_specification_link  text,
  so_drawing_no               text,
  description                 text,
  item_name_code              text,
  ga_drawings_folder_link     text,
  ga_status                   text,
  ga_status_notes             text,
  submission_no_of_days       integer,
  ga_submission_target_date   date,
  ga_submission_date          date,
  target_ga_approval_date     date,
  actual_ga_approval_date     date,
  approval_no_of_days         integer,
  no_of_days_delay            integer,
  ga_no                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_ga_so_idx ON sales_ga (our_so_no);

-- ── Work Order Status ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_wo (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no                       integer GENERATED ALWAYS AS IDENTITY,
  our_so_no                   text,
  bom_no                      text,
  bom_date                    date,
  so_checklist_link           text,
  product_specification_link  text,
  so_drawing_no               text,
  ga_drawings_folder_link     text,
  bom_folder_link             text,
  pre_production_checklist     text,
  work_order_folder_link      text,
  pre_production_plan          text,
  work_order_no               text,
  work_order_date             date,
  no_of_days                  integer,
  target_date                 date,
  actual_date                 date,
  work_order_pending_where    text,
  bo_status                   text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_wo_so_idx ON sales_wo (our_so_no);
