-- Masters module: Product + Hardware master data (Dorplus sheets).
-- Mirrors the sales_* pattern: uuid PK, generated Sr No, nullable columns,
-- created_at / updated_at timestamps.

CREATE TABLE IF NOT EXISTS master_product (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no                  integer GENERATED ALWAYS AS IDENTITY,
  fg_group               text,
  type_of_finished_good  text,
  uom                    text,
  specification          text,
  insulation             text,
  selling_price          numeric,
  remarks                text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS master_product_group_idx ON master_product (fg_group);

CREATE TABLE IF NOT EXISTS master_hardware (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no         integer GENERATED ALWAYS AS IDENTITY,
  hardware_type text,
  make          text,
  model         text,
  description   text,
  uom           text,
  buying_rate   numeric,
  selling_rate  numeric,
  image         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS master_hardware_type_idx ON master_hardware (hardware_type);
