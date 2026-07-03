-- 0069 — Sales panel: Quote Status + BOM Status (spreadsheet-style trackers).
-- Two free-form, Excel-like tables. Almost every column is nullable so users
-- can fill in whatever they have, row by row, like a Google Sheet. Idempotent.

create table if not exists sales_quotes (
  id                          uuid primary key default gen_random_uuid(),
  enquiry_no                  text,
  scope                       text,
  enquiry_source              text,
  introducer_name             text,
  company_name                text,
  person_name                 text,
  cell_no                     text,
  email                       text,
  product                     text,
  description                 text,
  item                        text,
  qty                         numeric,
  unit_of_measurement         text,
  rate                        numeric,
  basic_amount                numeric,
  quote_status                text,
  quote_link                  text,
  quotation_notes             text,
  po_no                       text,
  po_link                     text,
  po_amount                   numeric,
  po_date                     date,
  product_specification_link  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists sales_quotes_enquiry_idx on sales_quotes (enquiry_no);
create index if not exists sales_quotes_created_idx on sales_quotes (created_at desc);

create table if not exists sales_bom (
  id                          uuid primary key default gen_random_uuid(),
  sr_no                       integer generated always as identity,
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
  so_amendment_needed         boolean not null default false,
  so_amendment_reasons        text,
  amendment_date              date,
  amendment_related_notes     text,
  target_dispatch_date        date,
  actual_dispatch_date        date,
  days_to_produce             integer,
  actual_no_of_days           integer,
  no_of_days_delay            integer,
  ga_approval_needed          boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists sales_bom_enquiry_idx on sales_bom (enquiry_no);
create index if not exists sales_bom_created_idx on sales_bom (created_at desc);
