-- 0078 — NPD: project description + a unique, auto-assigned Project ID.
--
-- Two things land here:
--
--  1. DESCRIPTION. `npd_products.description` backs the new "Project Description"
--     field on the New Product form. Plain additive column, null on existing rows.
--
--  2. PROJECT ID. `sr_no` was an auto-assigned integer labelled "Product No",
--     with no uniqueness guarantee and nullable. It becomes the Project ID:
--     auto-generated, unique, never entered by hand.
--
--     The assignment rule is max(sr_no) + 1, which gives exactly the behaviour
--     asked for:
--       • 1,2,3,4,5 and 5 is deleted  -> max is 4, next is 5  (top number reused)
--       • 1,2,3,4   and 2 is deleted  -> max is 4, next is 5  (gap NEVER refilled)
--
--     Existing products are renumbered contiguously from 1 so everything has an
--     ID and new ones continue from the top.
--
-- ⚠ THE RENUMBER MUST RUN EXACTLY ONCE. apply-all-migrations.ts re-runs every
--   file on every invocation, and a second pass would compact live IDs — turning
--   1,3,4 back into 1,2,3 and handing out "2" again, which is precisely what the
--   rule forbids. The guard is the unique index below: it does not exist before
--   this migration and always exists after, so its absence IS "never normalised".
--   Do not replace that guard with a contiguity check — after a legitimate
--   deletion the IDs are *supposed* to have holes.

-- ── description ────────────────────────────────────────────────────────────
ALTER TABLE "npd_products" ADD COLUMN IF NOT EXISTS "description" text;

-- ── one-time Project ID normalisation ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname  = 'npd_products_sr_no_uq'
  ) THEN
    -- Ordered by the number they already had (unnumbered rows last, then oldest
    -- first) so the existing sequence is preserved as far as it exists, rather
    -- than shuffled. Safe to violate uniqueness mid-statement: the index that
    -- would enforce it is created afterwards.
    WITH ordered AS (
      SELECT "id",
             row_number() OVER (ORDER BY "sr_no" NULLS LAST, "created_at", "id") AS rn
        FROM "npd_products"
    )
    UPDATE "npd_products" p
       SET "sr_no" = o.rn
      FROM ordered o
     WHERE p."id" = o."id";
  END IF;
END $$;

-- Enforces the "unique" half of the requirement, and doubles as the run-once
-- marker above. A concurrent create that races to the same max+1 now fails
-- loudly here instead of silently minting a duplicate ID.
CREATE UNIQUE INDEX IF NOT EXISTS "npd_products_sr_no_uq" ON "npd_products" ("sr_no");
