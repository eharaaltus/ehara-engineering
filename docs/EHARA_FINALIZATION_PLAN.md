# Ehara Engineering WMS — Finalization Plan

_Author: engineering session 2026-07-08. Base app: `ehara-wms-full` (package `aa-tech-dashboard`, to be renamed). Reference framework: `taskmanagement-main` (Altus Corp / "Mananvasa" dashboard)._

This document is the single source of truth for bringing `ehara-wms-full` to **full Mananvasa
feature parity + Ehara-specific modules + complete Ehara branding**, then auditing it end-to-end
(no loops, no errors, no data loss, data integrity).

---

## 1. What we are starting from (verified state)

`ehara-wms-full` is **not** an early skeleton — it is a ~90% port of the Mananvasa framework with
Ehara manufacturing modules already added. Verified facts:

| Dimension | State |
|---|---|
| **Data model** | **Complete.** All 53 Mananvasa tables present **+ 14 custom Ehara tables** (`npd_products`, `npd_tasks`, `quotations`, `sales_bom/ga/pi/quotes/so/wo`, `master_hardware/product`, `incentive_catalog/entries/projects`). 67 tables total. |
| **App shape** | Reorganized around a **Portal** (`/portal`) with 4 workspaces: **WMS**, **Admin**, **Employees**, **User Manual**. Top nav = Dashboard · My Day · Tasks · Kanban(admin) · NPD. |
| **Runs?** | **Yes.** Dev logs show `/`, `/npd/...`, login, signout, idle-timeout all returning `200`. Auth (Firebase + session cookie + RLS) works. |
| **Branding** | **~80% Ehara.** Portal shows "Ehara Engineering" logo + "Powered by Altus Corp" footer + Ehara workspaces. Residual "AA Tech / Altus" in `package.json` name, `README`, docs, and **seed rosters still list Altus staff**. |
| **Infra** | Dev-mode **latency** against a remote free-tier Supabase (ap-south-1): multi-second queries + occasional `max clients reached (pool_size 15)`. Connection code (`lib/db/index.ts`) is already tuned (`max:10`, session pooler :5432). Treated as **environment latency**, not a code defect — verify against prod / a local Supabase. |

### Verified module status

**Wired & working:** Dashboard, My Day (agenda), Tasks (full workflow, kanban, import/export,
audit), NPD tracker (custom), Quotation + Proforma Invoice, Sales (BOM/GA/PI/SO/WO), Masters,
Attendance + Leave, Admin panel (employees, departments, designations, holidays, subjects,
settings, activity, notifications), Forms, Weekly Goals, Profile, Documents, Projects, Inbox,
Notifications (4-channel dispatch), Global search, PWA.

**"Coming Soon" stubs (2):** `Salary`, `Reimbursement` — tables exist, page renders a placeholder.

**Tables exist but NO UI (never built):**
- **Outstanding** receivables (`outstanding_contracts/installments/collections` + rosters)
- **Incentive** requests / ledger / dashboard (source `incentive_requests` + Ehara `incentive_*`)
- **Index hub** (`index_sections`/`index_links`)
- **Attendance dashboard** (`/attendance/dashboard`)
- Dynamic form modules: **Leave-approval**, **Record-reference**, **Participant-breakthrough**
- Admin roster pages: **clients**, **outstanding-products/entities/payment-modes/responsibles**,
  **paying-entities**, **salary-profiles**

> **No broken links.** Everything the current nav/hubs link to resolves (salary & reimbursement
> render the "coming soon" placeholder). The missing modules are simply **not linked anywhere yet.**

---

## 2. Gap analysis — what "full parity + Ehara" requires

### A. Finish stubbed modules (tables ready)
1. **Salary** — profiles, monthly runs, advances, policy + consent, **payslip PDF**. Port from
   `taskmanagement-main/app/(app)/salary/*` + `lib/queries/salary`, `lib/exports`, `scripts`.
2. **Reimbursement** — the dynamic form module (`module_submissions` where `module='reimbursement'`).

### B. Build missing modules (tables ready, no UI)
3. **Outstanding receivables** — contracts → installments → collections, aging buckets, dashboard,
   admin rosters. Largest single item (source has `lib/outstanding/*`, `app/(app)/outstanding/*`).
4. **Incentive** — requests + ledger + approval + dashboard. NOTE: Ehara added its own
   `incentive_catalog/entries/projects` tables — **reconcile** the Ehara model vs the source
   `incentive_requests` before building (decide which is canonical).
5. **Index hub** — editable link directory.
6. **Attendance dashboard** — the analytics view over `attendance_logs`.
7. **Dynamic forms** — leave-approval, record-reference, participant-breakthrough (or Ehara
   equivalents; confirm which the plant actually uses).
8. **Admin roster pages** — clients, outstanding rosters, paying-entities, salary-profiles.

### C. Branding completion
9. Rename package `aa-tech-dashboard` → `ehara-engineering-wms`; rewrite README; scrub residual
   "AA Tech / Altus Corp" strings **except** the deliberate "Powered by Altus Corp" footer + logo.
10. Reseed **rosters/seed data** with Ehara staff, customers, departments, subjects (remove Altus
    names like Manan Vasa / Rohan Choudhary in `db/enums.ts` `SEED_*`).
11. Confirm accent/theme colors match Ehara identity (currently blue `#1e40af` + red `#e11d2f`).

### D. Ehara manufacturing-WMS additions (proposed — need your confirmation)
Beyond parity, a plant WMS typically wants some of:
- **Inventory / stock** (raw material, WIP, finished goods, min-level alerts)
- **Purchase Orders + Vendor management** (tie into BOM/Sales)
- **Quality / NCR** (non-conformance reports, rework, 8D)
- **Machine / maintenance log** (preventive + breakdown)
- **Dispatch / delivery tracking** (link to Sales Orders)
- **Drawing / document revision control** (2D/3D versions — NPD already references links)
- **NPD Gantt / timeline** view over the 36-activity schedule
_These are candidates, not commitments — see decision list below._

---

## 3. Guiding principles (from the Mananvasa framework — preserve these)

- **Append-only event tables** for provenance (`*_events`) — never mutate history.
- **Soft-delete only** (`is_active` / `archived`) — **no hard deletes** ⇒ structural no-data-loss.
- **Optimistic locking** via `updatedAt`.
- **TS enums are the source of truth**; DB columns are `text`. Deprecated enum values are retained
  so historical rows keep rendering — schema changes never break old data.
- **Server Actions** for writes; **RLS** for reads.
- **Roster tables** back every picker with inline "+ add new".
- **Reuse the existing component/lib patterns** in `ehara-wms-full`; match house style — do not
  introduce a second way of doing things.

---

## 4. Proposed build order (safest first, each independently shippable)

1. **Branding pass** (low risk, high visibility): package/README/seed rosters/residual strings.
2. **Salary** (unstub) — self-contained, source code exists to port.
3. **Reimbursement** (unstub) — small, uses existing forms engine.
4. **Attendance dashboard** — read-only analytics, low risk.
5. **Index hub** — small.
6. **Admin roster pages** — unblock pickers for the finance modules.
7. **Outstanding receivables** — largest; do after rosters exist.
8. **Incentive** — after reconciling the Ehara vs source model.
9. **Dynamic forms** (leave-approval / record-reference / participant-breakthrough) — confirm need.
10. **Ehara manufacturing additions** (D) — only the ones you approve.
11. **Full end-to-end audit** (section 5).

Each module ships with: schema check → queries → server actions (with event rows) → UI → wire into
Portal/nav → typecheck → smoke test.

---

## 5. Final audit checklist (your explicit requirement)

- **No loops** — no redirect cycles (auth/middleware), no infinite `useEffect`/render loops, no
  recursive server-action re-entry, no unbounded recurrence materialization.
- **No errors** — `pnpm typecheck` clean, `pnpm lint` clean, `pnpm build` succeeds, no runtime
  console/server errors on every route; every nav/hub link resolves (no 404).
- **No data loss** — all writes go through soft-delete/event-log patterns; migrations are additive;
  seed/reset scripts verified; no destructive migration drops a populated column.
- **Data complete & whole** — FKs intact, no orphaned rows, every module's list/detail/export
  round-trips the same data; totals reconcile (e.g. installments sum = contract, collections net
  correctly); exports (CSV/XLSX/PDF) match on-screen data.

---

## 6. Open decisions (need your input)

1. **Incentive model** — keep Ehara's custom `incentive_catalog/entries/projects`, or the source
   `incentive_requests`, or merge? (Affects how the Incentive module is built.)
2. **Dynamic forms** — do you actually use leave-approval / record-reference / participant-
   breakthrough, or should those slots hold Ehara-specific forms instead?
3. **Manufacturing additions (§2.D)** — which, if any, to build now?
4. **Salary depth** — full payroll (runs, TDS/PT, payslip PDF) like Altus, or a simpler version?

---

## 7. Progress log

### Module 1 — Branding pass ✅ (2026-07-08)
Done: `package.json` + `functions/package.json` names → `ehara-engineering-*`; description;
`app/layout.tsx` metadataBase; `lib/site-url.ts` fallback; slack fallbacks
(`lib/slack/{templates,dispatch}.ts`); export filename prefixes `aa-tech-` → `ehara-`
(`lib/exports/{csv,tasks-rich,outstanding-rich}.ts`); `orgSettings.companyName` default →
"Ehara Engineering"; `app/api/health` service name; `scripts/bootstrap-admin.ts` email copy;
README rewritten. Kept the deliberate **"Powered by Altus Corp"** partner mark + logos.
Realigned tests left asserting old branding: `site-url`, `exports-csv`, `digest-copy` — all green.
Verified: no app-code identity strings remain; the 3 touched test files pass; no regressions.

**Deferred to their owning modules:** `db/enums.ts` `SEED_*` rosters (entities / payment-modes /
responsibles still list Altus names) → rebrand with Ehara billing entities when building
**Outstanding** (Module 7), together with `outstanding-enums*.test.ts`. Playwright visual specs
(`tests/visual/*`) that assert footer text → update in the final audit. Legacy one-time sheet
importers (`import-legacy/import-sheet/import-incentives`) keep their internal comments (won't run
for Ehara).

### Module 2 — Salary (full payroll) ✅ (2026-07-08)
Ported the complete Mananvasa salary module onto ehara's existing `salary_*` tables (which were
already migrated). Replaced the "Coming Soon" stub with the real report. Files added (22):
`lib/salary/{compute,generate,period,salary-log-import}.ts`, `lib/queries/salary.ts`,
`app/(app)/salary/{page,actions,export.xlsx,import,payslip/[runId],policy}`,
`app/(admin)/admin/salary-profiles/{page,actions}`, `components/salary/*` (report, import dialog,
policy upload, signature pad), `components/admin/salary-profile-{list,dialog}.tsx`,
`tests/unit/salary-{compute,period}.test.ts`.
Debranded: renamed `altus-log-import.ts` → `salary-log-import.ts` (+ `AltusLogMonthRow` →
`SalaryLogMonthRow`), payslip PDF author → "Ehara Engineering", `altus-red` dead class →
`red-300/red-600`, "Altus-Log" UI copy → "salary log", admin sidebar subtitle `aatech.com` →
"Ehara Engineering".
Wired: `/admin/salary-profiles` into the admin sidebar + mobile bar (Briefcase icon); Salary tile
in the Employees portal hub made **admin-only** (added `adminOnly`/`isAdmin` gating to
`WorkspaceHub`) to match the page's `requireAdmin()` — non-admins now see it locked, not bounced.
Verified: `tsc --noEmit` exit 0; salary unit tests 15/15 green; no dangling refs; access model
consistent (report/profiles admin-only, policy-consent page employee-facing by design).

### Module 3 — Reimbursement (unstub) ✅ (2026-07-08)
Ehara already had the full dynamic-forms engine (`components/forms/*`, `lib/forms/*`,
`lib/queries/modules.ts`, `forms/actions.ts`) and the `reimbursement` module was already defined —
only the page was a "Coming Soon" stub. Replaced the stub with `<ModulePage module="reimbursement">`
(request form + admin processing + Active/Archived tabs, backed by `module_submissions`).
Fixes: aligned module def `path` `/reimbursements` → `/reimbursement` (matched Ehara's actual route
+ hub/employees-nav link; the old plural would have 404'd the Active/Archived tabs). Debranded the
reimbursement option lists — dropped "Manan Sir Personal" expense head and the Altus GPay number,
reduced `TALLY_ENTITY` to "Ehara Engineering" (admin-editable), added manufacturing-relevant expense
heads (Freight & Transport, Tooling & Consumables), removed the Altus-workshop "Product Name" field.
Verified: `tsc --noEmit` exit 0; no orphaned `/reimbursements` refs; engine deps all present.
Note: the `reference` / `breakthrough` modules still hold Altus sales/workshop options — left for
Module 9 (decide whether Ehara needs them).

### Bug-fix pass — workspace separation (2026-07-08, after user review)
User reported: WMS/dashboard nav was showing on Employees-workspace pages (salary, reimbursement).
Root cause: the header takes a `workspace="wms"|"employees"` prop that swaps `MainNavServer` (WMS
pills) for `EmployeesNav` and repoints the "Workspace" back-link. The pages I added in M2/M3 omitted
it. Fixes:
- **Bug 1 (reported):** added `workspace="employees"` to `salary/page.tsx`, `salary/policy/page.tsx`,
  and threaded a new `workspace` prop through `ModulePage` (reimbursement passes `"employees"`).
  All 5 Employees pages (attendance, leave, salary, salary/policy, reimbursement) now show the
  Employees nav, not the WMS/dashboard pills.
- **Bug 2:** `EmployeesNav` showed a "Salary" pill to everyone, but the salary page is
  `requireAdmin()` — a non-admin click would bounce. Now the pill is admin-gated (desktop header +
  mobile drawer both pass `isAdmin`).
- Verified: `tsc --noEmit` exit 0; no remaining ComingSoon stubs; middleware has no redirect loop
  (invalid token → public `/login` with `next` param); no live links to the unwired
  `reference`/`breakthrough` module routes.

**Workspace separation hardening (user said "you decide what's best"):**
- Added a `"manual"` header mode. Header nav center now: Employees→`EmployeesNav`, WMS→`MainNavServer`,
  Manual→none. Mobile drawer mirrors this.
- **WMS-only quick actions**: `GlobalSearch` + `NewTaskTrigger` now render **only** in the WMS
  workspace — removed from Employees + Manual. Bonus: this also drops the `NewTaskTrigger`
  employees/clients/subjects queries from those pages (helps the earlier latency).
- **User Manual** now uses `workspace="manual"` — clean, nav-pill-free header.
- Net result — 4 visually distinct workspaces: **WMS** (main nav + search + new-task),
  **Employees** (employees nav only; Salary pill admin-gated), **Admin** (own sidebar layout),
  **User Manual** (bare header). Verified `tsc --noEmit` exit 0.

### Module 4 — Attendance dashboard ✅ (2026-07-08)
Ehara already had the entire attendance system (punch, leave, biometric, phases A/B, exports,
`attendance-status`/`comp-off`/`holidays` queries). Only the admin monthly dashboard was missing.
Ported 5 files: `app/(app)/attendance/dashboard/{page,actions}.tsx` +
`components/attendance/dashboard/{dashboard-table,employee-detail,month-selector}.tsx`.
Fixes on port: set `workspace="employees"` on the page (the M2/M3 bug class — caught proactively);
wired an admin-only **"Monthly Dashboard"** link into the `/attendance` page header (BarChart3 icon)
so admins can reach it. It's `requireAdmin()`-gated; Export Excel/PDF links resolve to the existing
`attendance/export.{xlsx,pdf}` routes. (The "Generate Salary" button stays disabled/"Phase 2" as in
source — Ehara's salary module has its own generation; wiring the two is a later enhancement.)
Verified: `tsc --noEmit` exit 0; attendance unit tests 30/30 green; no Altus branding in ported files.

### Module 5 — Index hub ✅ (2026-07-08)
Curated quick-links directory (`index_sections`/`index_links`), admin-editable. Ehara already had
the query + validator; ported 3 files: `app/(app)/index/{page,actions}.tsx` +
`components/index-hub/index-hub-board.tsx`. It's a WMS-workspace page (`requireUser`, default
`workspace="wms"` — correct). Debranded the one Altus string ("Altus Corp ecosystem" → "Ehara
Engineering workspace"). Wired an **"Index"** pill (Compass icon) into the WMS main nav.
Verified: `tsc --noEmit` exit 0; no residual branding; route + nav present. (Starts empty; admins
add sections/links via the inline editor.)

### Module 6 — Admin roster pages ✅ (2026-07-08)
Ported 6 admin roster CRUD pages + actions (clients, paying-entities, outstanding-products,
outstanding-entities, outstanding-payment-modes, outstanding-responsibles) + the 2 client
components (`client-list`, `create-client-dialog`). The 5 outstanding/entity pages reuse Ehara's
existing `outstanding-roster-list` component + `outstanding-rosters` query; the outstanding rosters
share `lib/outstanding/roster-actions.ts` (verified: `createRosterItem`/`updateRosterItem` both call
`requireAdmin()` — properly gated; clients uses `requireAdmin` directly ×4).
Wiring decision: added **Clients** + **Paying Entities** to the admin sidebar + mobile bar (generally
useful, unambiguous labels). The 4 Outstanding-specific rosters (products/entities/payment-modes/
responsibles) have ambiguous labels vs Ehara's NPD/Masters "products" — their pages exist and
typecheck, but nav-wiring is **deferred to Module 7 (Outstanding)** where they belong contextually.
Verified: `tsc --noEmit` exit 0; no branding; all mutations admin-gated.

Note: a `next dev` server is kept running in the background this session so `typedRoutes`
regenerates `.next/dev/types` as new routes are added — avoids the stale-cache tsc errors that a
killed dev server leaves behind.

### Module 7 — Outstanding receivables ✅ (2026-07-08)
The big UI port — but the entire `lib/outstanding/` logic layer (12 files) + both queries already
existed in Ehara. Ported the missing UI: 5 app files (`page`, `contracts/page`, `actions`,
`export.{pdf,xlsx}`) + 19 components (contract list, form/collection dialogs, installment editor,
import/export dialogs, and the full `dashboard/*` set — stat cards, overdue buckets, rollups, PDC,
month summary, etc.). `requireUser` (all users can view/log collections), `workspace="wms"`.
Debranding: PDF export Title/Author → Ehara; **rebranded the `SEED_*` rosters** (responsibles →
Ehara staff; entities → "Ehara Engineering"; products → manufacturing categories; payment modes →
generic) — these are admin-editable seed defaults, **user should confirm/adjust** to real values.
Updated the two `outstanding-enums*` tests to match.
Wiring: added an **"Outstanding"** pill (₹ icon) to the WMS main nav; surfaced the 4 Outstanding
rosters in the admin sidebar + mobile bar with **unambiguous labels** — "Receivable Products",
"Billing Entities", "Payment Modes", "Collection Owners" (avoids clashing with NPD/Masters
"products"), completing the M6 deferral.
Verified: `tsc --noEmit` exit 0; outstanding tests 25/25 — and this **cleared a pre-existing
baseline failure** (`outstanding-query-shape.test.ts` now passes, as the ported page provides the
`loadOutstanding`/`loadOutstandingDashboard` exports it checks). No residual branding.

### Post-M7 user review fixes (2026-07-08)
- **Index hub REMOVED** (reverts Module 5): user confirmed its content is entirely Altus/Manan
  Vasa, not relevant to Ehara. Deleted `app/(app)/index/`, `components/index-hub/`, and the WMS nav
  pill. Left the inert pre-existing `lib/queries/index-hub.ts` + `lib/cache-tags` entry +
  `index_sections`/`index_links` schema tables (unused, zero data, no destructive migration — safe
  to leave; can be dropped later if desired).
- **Outstanding dashboard filter freeze fixed**: its filter bar used `sticky top-[96px]` so it froze
  ~96px down the page ("in between"). Changed to `sticky top-0` with an opaque background to match
  the app's standard FilterBar ("owns top-0"). Now freezes at the very top like every other page.
- Verified: `tsc --noEmit` exit 0.

### Module 8 — Incentive ✅ (2026-07-08)
**Reconciliation (user delegated):** discovered Ehara's own `lib/queries/incentive.ts` already targets
the source `incentive_requests` model; the custom `incentive_catalog/entries/projects` (migration
0064) are a read-only import of *Altus's* "Eco System MIS" sheets with no UI. Critically, the source
`incentive_requests` module's whole structure is Altus coaching-business-specific (workshop
conversions: "Business Scale Up Shastra", participant/prospect, group intros) — **zero fit for
manufacturing**.
**User decision: configurable form.** Built Incentive as a 4th dynamic-form module (like
Reimbursement) on the existing forms engine + `module_submissions` — NO hardcoded Altus types.
Added the `incentive` module to `lib/forms/modules.ts` (request fields: Incentive Type [Production
Target / Quality / On-Time Delivery / Cost Saving / Referral / Other], description, period, claimed
amount, evidence link, notes; admin fields: approved, approved amount, payment date, paid-through) —
**all admin-editable at runtime**. Created `app/(app)/incentive/page.tsx` (`workspace="employees"`),
added `MODULE_UI.incentive`, and wired it into EmployeesNav + the Employees portal hub (Award icon).
The Altus `incentive_requests` + `catalog/entries/projects` tables + `lib/queries/incentive.ts` are
left inert (no UI references them). Verified: `tsc --noEmit` exit 0; no Altus coaching types present.

### Module 9 — Remove pure-Altus dynamic forms ✅ (2026-07-08)
Per user ("remove pure altus"): removed the `reference` (Record Reference — sales-lead referrals) and
`breakthrough` (Participant Breakthrough — workshop moments) dynamic modules entirely — both pure
Altus coaching/sales concepts, never given Ehara pages. Removed from `ModuleKey`, `MODULE_KEYS`,
the `MODULES` record, `MODULE_UI`, and deleted their exclusive Altus constants (DESIGNATION,
BUSINESS_CATEGORY, PROPOSED_SOLUTION). Kept `SALESPERSON_FIELD_KEY` + its resolver (generic —
auto-populates any `assign_salesperson` field with the live Sales roster; now inert but reusable).
"leave-approval" needed nothing: Ehara's **native** leave system already has full admin approval
(`decideLeave` requireAdmin + the leave-list pending→approve/reject UI). The dynamic-forms engine
now serves exactly the two Ehara-appropriate modules: **Reimbursement + Incentive**.
Verified: `tsc --noEmit` exit 0; no dangling refs to the removed modules/constants.

### Module 10a — Inventory / Stock ✅ (2026-07-08) — first greenfield mfg add-on
Net-new (no source). Migration **0076_inventory.sql** (additive/idempotent) — **applied to Supabase
+ verified** (both tables exist with exactly the schema's columns, 0 rows). Two tables:
`inventory_items` (catalogue; optional FKs to master_product/master_hardware) + `stock_movements`
(append-only ledger, signed `qty_delta`). **Current stock = SUM(qty_delta)** — never stored, so it
can't drift and nothing is lost. Enums `INVENTORY_CATEGORIES` + `STOCK_MOVEMENT_KINDS`.
Built: `lib/queries/inventory.ts` (items w/ computed on-hand + low-stock flag; movement ledger;
stats), `app/(app)/inventory/actions.ts` (item CRUD = `requireAdmin`; stock movements = `requireUser`
so shop floor can post in/out/adjust; rate-limited; item changes audited to settings_events),
`app/(app)/inventory/page.tsx` + `components/inventory/inventory-board.tsx` (table w/ low-stock
warning, Add-Item + Record-Movement dialogs). Wired an **"Inventory"** pill (Boxes) into the WMS nav.
Verified: `tsc --noEmit` exit 0; live DB columns match schema. Solid MVP per user's choice.

### Pivot (2026-07-08): remove Inventory, focus NPD + Dashboard, scrub Altus/aatech
**Inventory (10a) reverted** per user — deleted files/schema/enums/nav; **dropped the empty
`inventory_items`+`stock_movements` tables** I'd created this session (zero data, safe). PO/Quality/
Maintenance sub-modules dropped from scope.

**NPD focus.** The tracker was already complete + matched the user's Google Sheet (6 stages / 36
activities in `lib/npd/template.ts`, offset planned dates, applicability/on-hold/reasons, and a
sophisticated `lib/npd/status.ts`: state machine, health rating, predicted-end). Built the missing
piece — the **NPD Dashboard** (`/npd/dashboard`, "Dashboard" button on the NPD list):
`lib/npd/dashboard.ts` (pure `computePortfolio` — KPIs, health/status distributions, per-stage
completion, doer workload, per-product progress, overdue + upcoming activity lists);
`components/npd/dashboard/{stage-completion,doer-workload}-chart.tsx` (Recharts) + reused `Donut`;
comprehensive page with 7 KPIs, 4 charts, per-product progress bars, and overdue/upcoming tables.
Verified: `tsc` exit 0; `npd-dashboard.test.ts` 5/5; route returns 307 (compiles + runs); live data
present (2 products / 72 tasks).

**Altus/aatech residue scrub.** Fixed: `altus-red` (an **undefined** token → broken red on ~15
delete-buttons/focus-rings across Outstanding + admin/attendance) → working `red-600`/`--color-red`;
full-app **watermark** `/altus-corp-logo.png` → `/logo-mark.png`; **external dashboards** emptied
(were 3 Altus vpinnacle Apps-Script dashboards); `tone:"aatech"` styling keys → `"brand"` (admin +
action-rail); `aatech-brand-*` CSS animation classes → `ehara-brand-*`; localStorage keys
`aatech.*` → `ehara.*`; legal contact email → `ehara.altus@gmail.com`; calendar/cron fallback URLs
`wms.mananvasa.com` → ehara; login/import placeholder emails → generic; assorted comments.
⚠️ **`lib/quotation/types.ts` `COMPANY`** held AA Tech's full legal identity (ANANT AVINYA
TECHNOLOGIES LLP + real GST/PAN/bank/address) printed on every customer PI — replaced with
Ehara **placeholders** (`<…>`) + a loud ACTION-REQUIRED comment. **User must fill real details.**
Kept (deliberate): the "Powered by Altus Corp" partner mark + logo. Verified: `tsc` exit 0; tests 23/23.

### Advanced NPD Dashboard — D1–D5 + drill-down ✅ (2026-07-08)
Pulled the actual 5 dashboards from the user's Google Sheet (CSV-by-name export) and mirrored them
as **5 interactive tabs** with **click-to-drill-down** at `/npd/dashboard`:
- **Overview** — 8 KPIs; activities-by-stage stacked bar (click → that stage's activities); activity
  status + product-health donuts (clickable); doer-workload stacked bar (clickable).
- **Delay Analysis (D2)** — "#1 bottleneck" insight banner; stage **delay-days** horizontal bar
  (risk-coloured, click → overdue activities); top-15 delayed activities root-cause list.
- **Departments (D3/D4)** — stage-as-department workload table (done/pending/overdue/**delay-days**/
  risk, click a row → activities); **Internal-vs-Customer** delay split (clickable stats + bar);
  stage completion %.
- **Products (D5)** — all-products side-by-side comparison (%, done, overdue, hold, pending,
  delay-days, bottleneck stage, **predicted end**, risk; click a row → that product's activities).
- **Schedule (D1)** — overdue + due-in-14-days tables; per-product progress bars (clickable).
- **Drill-down drawer** — any chart bar / donut slice / table row / stat opens a right-side panel
  listing the underlying activities, with an "Open product" deep-link when scoped to one product.

New aggregations in `lib/npd/dashboard.ts` (all pure + unit-tested): summed **delay-days** (stage +
product + portfolio), stage bottleneck ranking with risk, **Internal-vs-Customer** classification
(`CUSTOMER_CODES`), per-product comparison rows w/ bottleneck stage + predicted end, enriched
activity list for client-side drill filtering. Covered the sheet's aspects **and** added ones it
lacks (predicted-end, portfolio drill-down). Verified: `tsc` exit 0; `npd-dashboard.test.ts` **8/8**
(now asserts delay-days, bottleneck, internal/customer, comparison); route 307.
Possible further adds if wanted: product/department multi-select toggles (like the sheet), a Gantt
timeline, and on-time/early/late efficiency for *completed* activities.

### NPD deep-build + Login redesign ✅ (2026-07-08)
**Products:** added `archived` (migration 0076, applied) + product-number auto-assign (`srNo`);
new actions `updateNpdProduct` / `setNpdArchived` / `deleteNpdProduct`. `/npd` is now an **inline
workspace** (`npd-workspace.tsx`): **search** by product-no / part-name / part-no / customer, a
**view toggle** (Products ⇄ Dashboard — same page, no reload; `/npd/dashboard` now redirects here),
product cards with **Edit / Archive / Delete** + "show archived".
**Dashboard:** now client-side computed from raw data with **product include/exclude toggles**;
**7 tabs** — Overview (radial gauge + donuts + stage/doer bars), Delays (D2), Departments (D3/D4),
**Efficiency** (early/on-time/late from completion vs planned), Products (D5), **Timeline** (a real
per-product **Gantt** with stage bars + today line), Schedule (D1). Every chart/row/slice/stat opens
a **drill-down drawer**. New `efficiency` aggregation added to `lib/npd/dashboard.ts`.
**Login:** rebuilt to match the reference — a drifting **poster-wall mosaic of Ehara's 13 real
marketing creatives** (`public/login-posters/`, replacing the old CSS mock tiles incl. a stray
"A A TECH" tile) behind a **centred dark glass card** (logo + Welcome back + email/password +
gradient Sign-in + Powered-by-Altus mark). Same Firebase auth.
Verified: `tsc --noEmit` exit 0; `npd-dashboard.test.ts` 8/8; live routes `/login` 200, `/npd` 307,
posters serve 200.

### NEEDS YOUR INPUT (real Ehara data to replace placeholders)
1. **PI/Quotation company block** (`lib/quotation/types.ts`) — legal name, address, **GST, PAN,
   bank a/c + IFSC**, sales email, website. Customer-facing; currently placeholders.
2. **Outstanding `SEED_*` rosters** (`db/enums.ts`) — real billing entities / receivable
   categories / banks (currently sensible Ehara defaults; admin-editable).
3. **Legal pages** privacy/terms contact — confirm `ehara.altus@gmail.com` is the right address.

### Branding-residue backlog (discovered; outside Salary scope — schedule a targeted sweep)
Pre-existing "aatech" residue that Module 1's global-identity pass didn't cover:
- **`lib/quotation/types.ts`** — `sales@aatech.co.in`, `www.aatech.co.in` → **customer-facing** on
  quotations/PI. **Highest priority** — fix when touching Quotation or in a branding sweep.
- `lib/external-dashboards.ts` (`aatech@vpinnacle.com`), `lib/backup/drive.ts` (internal boundary
  string), `app/(admin)/admin/page.tsx` (`tone: "aatech"` styling key — not user-visible),
  `app/error.tsx` (comment), `components/auth/animated-brand-backdrop.tsx` (CSS class names).
- `db/enums.ts` `SEED_*` rosters — still deferred to Module 7 (Outstanding).

### Pre-existing test failure baseline (NOT caused by branding; to fix in final audit)
Full `vitest run` shows failures that predate this work and are unrelated to branding — mostly
vitest partial-mock drift (e.g. `requireWeeklyGoalsFilled` missing from a `@/lib/auth/current`
mock) and DB-dependent query tests. Observed failing files: `activity-union`, `appearance`
(color-math assertion), `invite-employee-credentials`, `mark-task-read`, `notifications-list`,
`outstanding-query-shape`, `reset-employee-password`, `super-admin`, `task-actions-create-edit`,
`task-filters`, `was-password-reset-by-admin`. Count is flaky across runs (12–21 tests) — indicates
test-harness/environment instability to stabilize during the audit.
