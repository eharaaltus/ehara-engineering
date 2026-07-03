-- Production module: PI (Proforma Invoice) register. Mirrors the sales_* pattern.
CREATE TABLE IF NOT EXISTS sales_pi (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no           integer GENERATED ALWAYS AS IDENTITY,
  pi_no           text,
  pi_date         date,
  company_name    text,
  quote_ref       text,
  so_no           text,
  po_no           text,
  description     text,
  item_name_code  text,
  qty             numeric,
  uom             text,
  rate            numeric,
  basic_amount    numeric,
  gst_percent     numeric,
  gst_amount      numeric,
  total_amount    numeric,
  pi_status       text,
  remarks         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_pi_no_idx ON sales_pi (pi_no);
