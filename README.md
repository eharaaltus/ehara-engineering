# Ehara Engineering WMS

Internal **Work Management System** for Ehara Engineering — a manufacturer of precision engineering
parts and brackets for OEMs (Mahindra M&M and others across defence, EV, tractors, trucks, and
seating). One app, several modules: task/work management, a **New Product Development (NPD)** stage
tracker, quotations & sales, attendance & HR, and an operations dashboard — all on one
status-coded surface.

_Built on the Mananvasa work-management framework. **Powered by Altus Corp.**_

## Quickstart

```bash
pnpm install
cp .env.local.example .env.local   # fill in Supabase / Firebase / Resend values
pnpm db:generate                    # generate first migration
pnpm db:migrate                     # apply schema to your dev Supabase
pnpm dev                            # http://localhost:3000
```

The dashboard renders an empty-state welcome hero until at least one task or employee exists.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript strict |
| `pnpm test` | Vitest unit tests on transforms |
| `pnpm test:visual` | Playwright visual smoke tests |
| `pnpm db:generate` | Generate SQL migration from Drizzle schema |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |

## Stack

Next.js 16 · React 19 · TypeScript strict · Tailwind v4 + custom CSS · Supabase Postgres · Drizzle
ORM · TanStack Table · Recharts · Motion · Radix primitives · Vercel.

## Modules

- **WMS** — tasks (workflow, kanban, agenda, audit trail), projects, weekly goals, documents.
- **NPD** — New Product Development tracker: per-product 6-stage / 36-activity schedule with doers,
  supervisors, planned dates and status.
- **Quotation & Sales** — quotations + proforma invoice, BOM / GA / PI / SO / WO.
- **Employees / HR** — attendance, leave, salary, reimbursements.
- **Admin** — employees, departments, designations, holidays, subjects, master data, settings,
  activity/audit feed, notifications.

See [docs/EHARA_FINALIZATION_PLAN.md](docs/EHARA_FINALIZATION_PLAN.md) for the module-completion roadmap.

## Authentication

Auth is **invite-only**. New employees are created by an admin from `/admin/employees`; they
receive a branded email and set their password. There is no public sign-up.

- **Firebase Auth** issues identity (email + password, password-reset emails).
- A `__session` cookie carries the verified session (`admin.auth().createSessionCookie()`).
- **`next-firebase-auth-edge`** middleware verifies the cookie on every request with
  `checkRevoked: true`, so deactivated employees lose access immediately.
- **Supabase Postgres** is the data store. Firebase ID tokens are passed to `supabase-js` via its
  `accessToken` callback so RLS policies evaluate `auth.jwt() ->> 'sub'` against Firebase UIDs.

### Bootstrap the first admin

```bash
cp .env.local .env.bootstrap     # copy and add SUPABASE_SERVICE_ROLE_KEY
pnpm bootstrap-admin --email <admin-email> --name "<Admin Name>"
```

Then delete `.env.bootstrap`. Full runbook at `docs/runbooks/bootstrap-first-admin.md`.
