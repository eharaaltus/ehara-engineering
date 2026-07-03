-- Proforma Invoice metadata for a quotation (customer address, terms, HSN,
-- freight, etc.). Door line items live in quotations.lines (jsonb).
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pi_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
