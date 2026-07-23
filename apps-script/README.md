# NPD ⇄ Google Sheet — live two-way mirror

**Postgres is the system of record. The sheet is a live mirror of it.**

Your team can keep working in the spreadsheet; the app stays authoritative, and
neither one goes stale.

```
                 human types in a yellow cell
   Google Sheet ───────────── onEdit ─────────────▶  /api/npd/sheet-hook
        ▲                                                    │
        │                                              validate + write
        │                                              recompute the row
        └───────── push (recomputed row, ~1s) ◀──────────────┘
```

---

## The one rule that makes this safe

For every column, **exactly one side is the author.**

| Column kind | Examples | Who authors it |
|---|---|---|
| **Human** (yellow cells) | Resolution, Applicability, Planned Date, Doer, Supervisor, Completion, 2D&3D link, Reasons, Customer, Part name/no, Start/Target, Status | Either side. Travels **both** ways. |
| **Derived** (grey cells) | Days Left, Status, Progress %, Health, Overdue count, Predicted End | **App only.** Pushed *down* into the sheet as values, never read back. |
| **Key** (hidden) | `UID` | App only. Protected. |

Because the two sides never both write the same cell, they can never disagree
about it. That is what turns "two-way spreadsheet sync" from a conflict nightmare
into something tractable.

If someone types over a derived cell, the next push silently corrects it.

### Why `Days Left` is no longer a formula

The old sheet computed `Days Left = TODAY() − Planned`. That counts Sundays and
Diwali as working days. A task showing *"3 days left"* on the Friday before a
festival really has **one** working day left, and every plan built on that number
is quietly optimistic.

The app now computes it in **working days**, skipping Sundays and the company
holiday calendar (Admin → Holidays), and writes the answer into the sheet. The
spreadsheet cannot do this, and it is the single clearest reason the app is worth
having.

---

## Setup — 5 minutes, once

No Google Cloud project. No service-account key. No OAuth consent screen.

### 1. Paste the script
Open the sheet → **Extensions → Apps Script**. Delete whatever is there and paste
all of [`Code.gs`](./Code.gs).

### 2. Add the two script properties
**Project Settings** (⚙️) → **Script Properties** → *Add script property*:

| Property | Value |
|---|---|
| `APP_URL` | `https://your-app.vercel.app` (no trailing slash) |
| `SHEET_SECRET` | a long random string — **the same one** you put in `NPD_SHEET_SECRET` |

Generate the secret with `openssl rand -base64 48`.

### 3. Format the sheet
In the Apps Script editor, select **`setupSheet`** from the function dropdown and
press **▶ Run**. Approve the permission prompt on first run.

This rebuilds both tabs with the correct columns, hides + protects the `UID`
column, colours human cells amber and app-owned cells grey, and installs the
dropdowns and conditional formatting.

> ⚠️ **This restructures your existing tabs.** Take a copy of the sheet first if
> you want the old layout preserved. The current data will be replaced by the
> app's data on the first push.

### 4. Deploy as a Web App
**Deploy → New deployment → ⚙️ → Web app**

| Setting | Value |
|---|---|
| Execute as | **Me** |
| Who has access | **Anyone** |

Copy the `/exec` URL → paste it into the app's env as `NPD_SHEET_WEBAPP_URL`.

> **"Anyone" sounds alarming.** It's how Apps Script web apps work — there is no
> Google identity for a server-to-server call to present. The URL is unguessable
> and *every* request must carry `SHEET_SECRET` or it's rejected. The secret is
> the entire security boundary, so treat it like a password and rotate it in both
> places if it ever leaks.

### 5. Turn on live push-back
Run **`installTriggers`** from the function dropdown. This wires the `onEdit`
trigger so sheet edits reach the app instantly.

### 6. Seed the sheet from the app
In the app: **NPD → Products → the `Sheet` button**. This rewrites the sheet from
the database, stamping every row with its `UID`.

From here on it's live in both directions.

---

## Using it

- **Type in a yellow cell** → the `Sync` column shows `⏳`, then `✓` about a second
  later, and the app's recomputed Status / Days Left appear in the grey cells.
- **`⚠️ App unreachable`** in the Sync column → the app is down or `APP_URL` is
  wrong. Your edit is safe in the sheet; hit **Pull** in the app once it's back.
- **Pasting a block of rows?** `onEdit` does **not** fire for pastes, undo, or
  other scripts. Use the **Pull** button in the app afterwards — that's exactly
  what it's for.
- **Adding a product?** Do it in the app, not the sheet. The app assigns the UUID
  and generates all 36 activities on a working-day schedule; a spreadsheet row
  can't. Typing a new row into the Products tab shows
  `⚠️ Add products in the app` rather than silently doing nothing.
- **Sheet gone wrong?** (someone sorted the rows, deleted the UID column, pasted
  over everything) → hit **Sheet** in the app. It rebuilds from the database, no
  questions asked. The database is the system of record; the sheet is always
  recoverable from it.

---

## Files

| File | What it is |
|---|---|
| `apps-script/Code.gs` | Runs **inside Google**. The Web App endpoint + the `onEdit` trigger. |
| `lib/npd/sheet-sync.ts` | Runs **in the app**. Builds the rows, calls the Web App, applies inbound edits. |
| `app/api/npd/sheet-hook/route.ts` | The endpoint the sheet POSTs to. Constant-time secret check, fails closed. |
| `lib/npd/workdays.ts` | The working-day calendar. Why `Days Left` is right and the sheet's wasn't. |
