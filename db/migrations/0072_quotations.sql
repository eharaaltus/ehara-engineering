-- Quotation builder: header + door line items (with per-door hardware) stored
-- as JSONB; totals are computed on render. Looks up Product & Hardware masters.
CREATE TABLE IF NOT EXISTS quotations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_no    text,
  quote_date  date,
  project     text,
  customer    text,
  subject     text,
  lines       jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
