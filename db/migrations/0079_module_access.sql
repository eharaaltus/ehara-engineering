-- 0079 — per-module access control.
--
-- One row = one explicit grant of a workspace module to a subject. Three
-- subject levels, resolved most-specific-first at read time:
--
--   employee   → this one person
--   department → everyone in that department (an allow beats a deny, so adding
--                someone to a second team can never remove access)
--   everyone   → the org-wide default for non-admin staff
--
-- No row at a level = "inherit"; falling through every level lands on the code
-- default in lib/access/modules.ts. Admins bypass the `everyone` layer (so an
-- org-wide deny never locks the admin panel's owners out of a module);
-- super-admins bypass the whole thing.
--
-- The admin panel itself is deliberately NOT a module here. Granting it through
-- this same table would let one admin lock every other admin out of the tool
-- that manages access. It stays gated by the `is_admin` flag.
--
-- Additive + idempotent, per this repo's convention (apply-all-migrations.ts
-- re-runs every file on every invocation).

CREATE TABLE IF NOT EXISTS module_access_grants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    text NOT NULL,
  subject_type text NOT NULL,
  subject_id   uuid,
  allowed      boolean NOT NULL,
  updated_by   uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT module_access_grants_subject_ck CHECK (
    (subject_type = 'everyone' AND subject_id IS NULL)
    OR (subject_type IN ('department', 'employee') AND subject_id IS NOT NULL)
  )
);

-- Two PARTIAL uniques rather than one composite: `subject_id` is NULL for the
-- org-wide rows, and NULLs never collide in a plain unique index, so a single
-- composite would happily allow two conflicting 'everyone' rows for a module.
CREATE UNIQUE INDEX IF NOT EXISTS module_access_grants_everyone_uq
  ON module_access_grants (module_id)
  WHERE subject_type = 'everyone';

CREATE UNIQUE INDEX IF NOT EXISTS module_access_grants_subject_uq
  ON module_access_grants (module_id, subject_type, subject_id)
  WHERE subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS module_access_grants_subject_idx
  ON module_access_grants (subject_type, subject_id);

-- Seed the org-wide defaults to REPRODUCE TODAY'S BEHAVIOUR exactly, so turning
-- this on changes nothing until an admin uses the matrix:
--   wms / employees / manual — everyone could already reach these.
--   npd                      — was requireAdmin(); deny-for-everyone plus the
--                              admin bypass is the same result, and now it can
--                              also be opened to one engineer without making
--                              them an admin.
INSERT INTO module_access_grants (module_id, subject_type, subject_id, allowed)
VALUES
  ('wms',       'everyone', NULL, true),
  ('employees', 'everyone', NULL, true),
  ('manual',    'everyone', NULL, true),
  ('npd',       'everyone', NULL, false)
ON CONFLICT DO NOTHING;
