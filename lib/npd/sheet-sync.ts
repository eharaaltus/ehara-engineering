/**
 * Google Sheet ⇄ Postgres mirror for NPD.
 *
 * Postgres is the system of record. The sheet is a live mirror that the team can
 * keep working in. The contract with `apps-script/Code.gs` is deliberately
 * narrow, and it rests on one rule:
 *
 *   For every column, exactly ONE side is the author.
 *
 *   • Human columns  (Resolution, Applicability, Planned Date, Doer, Reasons,
 *     link, part name/no, customer, dates, status) — authored in either place,
 *     travel BOTH ways, resolved last-write-wins on `updatedAt`.
 *   • Derived columns (Days Left, Status, Progress %, Health, Overdue count,
 *     Predicted End) — authored ONLY by the app, pushed DOWN into the sheet as
 *     values, and never read back. If a user types over one, the next push
 *     silently corrects it.
 *
 * That single rule is what makes a two-way spreadsheet sync tractable instead of
 * a conflict nightmare: the two sides can never disagree about a cell, because
 * they never both write it.
 */

import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdProducts, npdTasks, npdSyncLog, employees, holidays } from "@/db/schema";
import { computeHealth, computeNpd, computePredictedEnd } from "@/lib/npd/status";
import { makeCalendar, workdaysBetween, todayISO, type WorkdayCalendar } from "@/lib/npd/workdays";

// ── Wire format (must match apps-script/Code.gs `rowValues_`) ───────────────

export interface SheetProductRow {
  uid: string;
  srNo: number | null;
  customer: string | null;
  partName: string;
  partNo: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  baselineEndDate: string | null;
  defaultDoerName: string | null;
  defaultSupervisorName: string | null;
  status: string;
  progressPct: number;
  health: string;
  overdueCount: number;
  predictedEndDate: string | null;
}

export interface SheetTaskRow {
  uid: string;
  srNo: number | null;
  partName: string;
  stage: string;
  code: string;
  activityPlan: string;
  doerName: string | null;
  supervisorName: string | null;
  plannedDate: string | null;
  daysLeft: number | string;
  resolution: string;
  completionDate: string | null;
  status: string;
  drawingLink: string | null;
  applicability: string;
  reasons: string | null;
}

/** The subset of a product row a human may author in the sheet. */
export interface ProductEdit {
  srNo?: number | null;
  customer?: string | null;
  partName?: string | null;
  partNo?: string | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  defaultDoerName?: string | null;
  defaultSupervisorName?: string | null;
  status?: string | null;
}

/** The subset of an activity row a human may author in the sheet. */
export interface TaskEdit {
  doerName?: string | null;
  supervisorName?: string | null;
  plannedDate?: string | null;
  resolution?: string | null;
  completionDate?: string | null;
  drawingLink?: string | null;
  applicability?: string | null;
  reasons?: string | null;
}

// ── Config ─────────────────────────────────────────────────────────────────

export function sheetConfig(): { url: string; secret: string } | null {
  const url = process.env.NPD_SHEET_WEBAPP_URL;
  const secret = process.env.NPD_SHEET_SECRET;
  if (!url || !secret) return null;
  return { url, secret };
}

export function isSheetSyncEnabled(): boolean {
  return sheetConfig() !== null;
}

type ScriptResponse = {
  ok: boolean;
  error?: string;
  productsWritten?: number;
  tasksWritten?: number;
  products?: (ProductEdit & { uid: string })[];
  tasks?: (TaskEdit & { uid: string })[];
  removed?: number;
};

async function callScript(body: Record<string, unknown>, timeoutMs = 25_000): Promise<ScriptResponse> {
  const cfg = sheetConfig();
  if (!cfg) return { ok: false, error: "Sheet sync is not configured (NPD_SHEET_WEBAPP_URL / NPD_SHEET_SECRET)" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, secret: cfg.secret }),
      signal: ctrl.signal,
      // Apps Script /exec always 302s to script.googleusercontent.com; fetch
      // follows it by default, which is what we want.
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `Apps Script HTTP ${res.status}` };
    const text = await res.text();
    try {
      return JSON.parse(text) as ScriptResponse;
    } catch {
      // Almost always means the Web App is deployed with the wrong access level
      // and Google served an HTML login page instead of our JSON.
      return {
        ok: false,
        error: "Apps Script returned HTML, not JSON — re-deploy the Web App with access set to “Anyone”.",
      };
    }
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError" ? "Apps Script timed out" : String(err);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function pingSheet(): Promise<ScriptResponse> {
  return callScript({ action: "ping" }, 10_000);
}

// ── Building the rows the sheet sees ───────────────────────────────────────

async function loadCalendar(): Promise<WorkdayCalendar> {
  const rows = await db
    .select({ d: holidays.holidayDate })
    .from(holidays)
    .where(eq(holidays.isActive, true));
  return makeCalendar(rows.map((r) => r.d));
}

/** Workday-aware "days left" for the sheet's column J. Negative = overdue. */
function daysLeftFor(plannedDate: string | null, cal: WorkdayCalendar): number | string {
  if (!plannedDate) return "";
  return workdaysBetween(todayISO(), plannedDate, cal);
}

interface Ctx {
  cal: WorkdayCalendar;
  nameById: Map<string, string>;
}

async function loadCtx(): Promise<Ctx> {
  const [cal, emps] = await Promise.all([
    loadCalendar(),
    db.select({ id: employees.id, name: employees.name }).from(employees),
  ]);
  return { cal, nameById: new Map(emps.map((e) => [e.id, e.name])) };
}

type ProductRow = typeof npdProducts.$inferSelect;
type TaskRow = typeof npdTasks.$inferSelect;

function buildProductRow(p: ProductRow, tasks: TaskRow[], ctx: Ctx): SheetProductRow {
  const lite = tasks.map((t) => ({
    plannedDate: t.plannedDate,
    resolution: t.resolution,
    completionDate: t.completionDate,
    applicability: t.applicability,
  }));
  const h = computeHealth(lite);
  return {
    uid: p.id,
    srNo: p.srNo,
    customer: p.customer,
    partName: p.partName,
    partNo: p.partNo,
    startDate: p.startDate,
    targetEndDate: p.targetEndDate,
    baselineEndDate: p.baselineEndDate,
    defaultDoerName: p.defaultDoerId ? ctx.nameById.get(p.defaultDoerId) ?? null : null,
    defaultSupervisorName: p.defaultSupervisorId ? ctx.nameById.get(p.defaultSupervisorId) ?? null : null,
    status: p.status,
    progressPct: h.percentDone,
    health: h.health,
    overdueCount: h.overdue,
    predictedEndDate: computePredictedEnd(lite, p.targetEndDate),
  };
}

function buildTaskRow(t: TaskRow, p: ProductRow, ctx: Ctx): SheetTaskRow {
  const c = computeNpd({
    plannedDate: t.plannedDate,
    resolution: t.resolution,
    completionDate: t.completionDate,
    applicability: t.applicability,
  });
  return {
    uid: t.id,
    srNo: p.srNo,
    partName: p.partName,
    stage: t.stage,
    code: t.code,
    activityPlan: t.activityPlan,
    doerName: t.doerId ? ctx.nameById.get(t.doerId) ?? null : null,
    supervisorName: t.supervisorId ? ctx.nameById.get(t.supervisorId) ?? null : null,
    plannedDate: t.plannedDate,
    daysLeft: daysLeftFor(t.plannedDate, ctx.cal),
    resolution: t.resolution,
    completionDate: t.completionDate,
    status: c.label,
    drawingLink: t.drawingLink,
    applicability: t.applicability,
    reasons: t.reasons,
  };
}

// ── APP → SHEET ────────────────────────────────────────────────────────────

/**
 * Push one product and all of its activities to the sheet.
 *
 * Called after every app-side write. Fire-and-forget from server actions: a
 * sheet outage must never fail the user's save, so callers should NOT await this
 * in a way that can throw. It logs its own failures.
 */
export async function pushProduct(productId: string): Promise<ScriptResponse> {
  const started = Date.now();
  if (!isSheetSyncEnabled()) return { ok: false, error: "not configured" };

  const [ctx, [product], tasks] = await Promise.all([
    loadCtx(),
    db.select().from(npdProducts).where(eq(npdProducts.id, productId)),
    db.select().from(npdTasks).where(eq(npdTasks.productId, productId)),
  ]);
  if (!product) return { ok: false, error: "product not found" };

  const res = await callScript({
    action: "push",
    products: [buildProductRow(product, tasks, ctx)],
    tasks: tasks.map((t) => buildTaskRow(t, product, ctx)),
  });

  await logSync({
    direction: "push",
    ok: res.ok,
    error: res.error,
    productsPushed: res.ok ? 1 : 0,
    tasksPushed: res.ok ? tasks.length : 0,
    durationMs: Date.now() - started,
  });
  return res;
}

/**
 * Rewrite the entire sheet from the database.
 *
 * This is the "make it match, no questions asked" button. Use it for first-time
 * setup and whenever someone has mangled the sheet badly enough that row-level
 * upserts can't fix it (deleted UID column, sorted rows, pasted a block).
 */
export async function rebuildSheet(triggeredById?: string): Promise<ScriptResponse> {
  const started = Date.now();
  if (!isSheetSyncEnabled()) return { ok: false, error: "not configured" };

  const [ctx, products, tasks] = await Promise.all([
    loadCtx(),
    db.select().from(npdProducts),
    db.select().from(npdTasks),
  ]);
  const byProduct = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const arr = byProduct.get(t.productId) ?? [];
    arr.push(t);
    byProduct.set(t.productId, arr);
  }

  // Sheet reads top-to-bottom like a human would: product order, then the 36
  // activities in template order inside each product.
  const ordered = [...products].sort((a, b) => (a.srNo ?? 1e9) - (b.srNo ?? 1e9));
  const taskRows: SheetTaskRow[] = [];
  for (const p of ordered) {
    const ts = (byProduct.get(p.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    for (const t of ts) taskRows.push(buildTaskRow(t, p, ctx));
  }

  const res = await callScript(
    {
      action: "rebuild",
      products: ordered.map((p) => buildProductRow(p, byProduct.get(p.id) ?? [], ctx)),
      tasks: taskRows,
    },
    60_000,
  );

  await logSync({
    direction: "push",
    ok: res.ok,
    error: res.error,
    productsPushed: res.ok ? ordered.length : 0,
    tasksPushed: res.ok ? taskRows.length : 0,
    durationMs: Date.now() - started,
    triggeredById,
  });
  return res;
}

/** Tell the sheet to drop rows for UIDs that no longer exist in the DB. */
export async function deleteFromSheet(uids: string[]): Promise<ScriptResponse> {
  if (!isSheetSyncEnabled() || uids.length === 0) return { ok: true };
  return callScript({ action: "delete", uids });
}

// ── SHEET → APP ────────────────────────────────────────────────────────────

const RESOLUTIONS = new Set(["Open", "Done", "On Hold"]);
const APPLICABILITIES = new Set(["Applicable", "N/A", "On Hold"]);
const PRODUCT_STATUSES = new Set(["Active", "On Hold", "Completed", "Cancelled"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return ISO_DATE.test(s) ? s : null;
}
function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/**
 * Apply one activity edit that came from the sheet.
 *
 * Everything here is defensive on purpose: this input is a spreadsheet cell,
 * which means it can contain literally anything a human can type. An unknown
 * Resolution or a garbage date is dropped rather than written, and the push-back
 * then shows the human the corrected value in their own sheet — the app teaching
 * the sheet, not crashing on it.
 */
export async function applyTaskEdit(
  uid: string,
  edit: TaskEdit,
  nameToId: Map<string, string>,
): Promise<{ ok: true; productId: string } | { ok: false; error: string }> {
  const [existing] = await db.select().from(npdTasks).where(eq(npdTasks.id, uid));
  if (!existing) return { ok: false, error: "unknown activity UID" };

  const patch: Partial<typeof npdTasks.$inferInsert> = {
    updatedAt: new Date(),
    updatedSource: "sheet",
  };

  const resolution = cleanStr(edit.resolution);
  if (resolution && RESOLUTIONS.has(resolution)) {
    patch.resolution = resolution as "Open" | "Done" | "On Hold";
  }

  const applicability = cleanStr(edit.applicability);
  if (applicability && APPLICABILITIES.has(applicability)) {
    patch.applicability = applicability as "Applicable" | "N/A" | "On Hold";
  }

  // Completion date is a FUNCTION of resolution, never independent. Marking Done
  // in the sheet without typing a date must still stamp today, and re-opening
  // must clear the date — otherwise computeNpd sees a stale completionDate and
  // the row is stuck showing "✓ Done" forever. Same invariant the app's own
  // updateNpdTask enforces; the sheet doesn't get to bypass it.
  const effectiveResolution = (patch.resolution ?? existing.resolution) as string;
  if (effectiveResolution === "Done") {
    patch.completionDate = cleanDate(edit.completionDate) ?? existing.completionDate ?? todayISO();
  } else {
    patch.completionDate = null;
  }

  if (edit.plannedDate !== undefined) patch.plannedDate = cleanDate(edit.plannedDate);
  if (edit.drawingLink !== undefined) patch.drawingLink = cleanStr(edit.drawingLink);
  if (edit.reasons !== undefined) patch.reasons = cleanStr(edit.reasons);

  // People arrive as display names ("Sachin"), because that is what a sheet can
  // show. Resolve to an employee id; an unrecognised name clears the field
  // rather than inventing an employee.
  if (edit.doerName !== undefined) {
    patch.doerId = resolveEmployee(edit.doerName, nameToId);
  }
  if (edit.supervisorName !== undefined) {
    patch.supervisorId = resolveEmployee(edit.supervisorName, nameToId);
  }

  await db.update(npdTasks).set(patch).where(eq(npdTasks.id, uid));
  return { ok: true, productId: existing.productId };
}

export async function applyProductEdit(
  uid: string,
  edit: ProductEdit,
  nameToId: Map<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [existing] = await db.select().from(npdProducts).where(eq(npdProducts.id, uid));
  if (!existing) return { ok: false, error: "unknown product UID" };

  const patch: Partial<typeof npdProducts.$inferInsert> = {
    updatedAt: new Date(),
    updatedSource: "sheet",
  };

  const partName = cleanStr(edit.partName);
  if (partName) patch.partName = partName; // never allow the sheet to blank a required field

  if (edit.customer !== undefined) patch.customer = cleanStr(edit.customer);
  if (edit.partNo !== undefined) patch.partNo = cleanStr(edit.partNo);
  if (edit.startDate !== undefined) patch.startDate = cleanDate(edit.startDate);
  if (edit.targetEndDate !== undefined) patch.targetEndDate = cleanDate(edit.targetEndDate);
  if (edit.srNo !== undefined && edit.srNo !== null && Number.isFinite(Number(edit.srNo))) {
    patch.srNo = Number(edit.srNo);
  }
  const status = cleanStr(edit.status);
  if (status && PRODUCT_STATUSES.has(status)) {
    patch.status = status as "Active" | "On Hold" | "Completed" | "Cancelled";
  }
  if (edit.defaultDoerName !== undefined) patch.defaultDoerId = resolveEmployee(edit.defaultDoerName, nameToId);
  if (edit.defaultSupervisorName !== undefined) {
    patch.defaultSupervisorId = resolveEmployee(edit.defaultSupervisorName, nameToId);
  }

  await db.update(npdProducts).set(patch).where(eq(npdProducts.id, uid));
  return { ok: true };
}

function resolveEmployee(name: string | null | undefined, nameToId: Map<string, string>): string | null {
  const n = cleanStr(name);
  if (!n) return null;
  return nameToId.get(n.toLowerCase()) ?? null;
}

export async function employeeNameIndex(): Promise<Map<string, string>> {
  const emps = await db.select({ id: employees.id, name: employees.name }).from(employees);
  const m = new Map<string, string>();
  for (const e of emps) {
    m.set(e.name.toLowerCase(), e.id);
    // "Sachin Dhumale" should also answer to "Sachin" — the sheet has always
    // used first names, and forcing the team to retype full names would be the
    // app inconveniencing the humans instead of the other way round.
    const first = e.name.split(/\s+/)[0]?.toLowerCase();
    if (first && !m.has(first)) m.set(first, e.id);
  }
  return m;
}

/** Recompute a single row and hand it back to the sheet, so the human who just
 *  typed sees the authoritative Status / Days Left within a second. */
export async function echoRow(
  tab: "Products" | "Task_Tracker",
  uid: string,
): Promise<SheetProductRow | SheetTaskRow | null> {
  const ctx = await loadCtx();
  if (tab === "Products") {
    const [p] = await db.select().from(npdProducts).where(eq(npdProducts.id, uid));
    if (!p) return null;
    const tasks = await db.select().from(npdTasks).where(eq(npdTasks.productId, p.id));
    return buildProductRow(p, tasks, ctx);
  }
  const [t] = await db.select().from(npdTasks).where(eq(npdTasks.id, uid));
  if (!t) return null;
  const [p] = await db.select().from(npdProducts).where(eq(npdProducts.id, t.productId));
  if (!p) return null;
  return buildTaskRow(t, p, ctx);
}

/**
 * Full reconcile: read every human column out of the sheet and apply it.
 *
 * The row-level webhook covers normal typing, but `onEdit` does NOT fire for
 * pasted blocks, undo, or edits made by other scripts — and it is exactly those
 * bulk operations that a spreadsheet team does constantly. This is the safety
 * net, and it's why the UI has a visible "Pull from Sheet" button.
 */
export async function pullSheet(triggeredById?: string): Promise<
  { ok: true; applied: number; skipped: number } | { ok: false; error: string }
> {
  const started = Date.now();
  const res = await callScript({ action: "pull" }, 60_000);
  if (!res.ok) {
    await logSync({ direction: "pull", ok: false, error: res.error, triggeredById });
    return { ok: false, error: res.error ?? "pull failed" };
  }

  const nameToId = await employeeNameIndex();
  let applied = 0;
  let skipped = 0;

  for (const p of res.products ?? []) {
    const r = await applyProductEdit(p.uid, p, nameToId);
    r.ok ? applied++ : skipped++;
  }
  for (const t of res.tasks ?? []) {
    const r = await applyTaskEdit(t.uid, t, nameToId);
    r.ok ? applied++ : skipped++;
  }

  await logSync({
    direction: "pull",
    ok: true,
    rowsApplied: applied,
    rowsSkipped: skipped,
    durationMs: Date.now() - started,
    triggeredById,
  });

  // The pull only moved human columns in. Derived columns in the sheet are now
  // stale (a new Resolution means a new Status), so push the truth straight back.
  await rebuildSheet(triggeredById);
  return { ok: true, applied, skipped };
}

// ── Audit ──────────────────────────────────────────────────────────────────

async function logSync(entry: {
  direction: "push" | "pull" | "hook";
  ok: boolean;
  error?: string;
  productsPushed?: number;
  tasksPushed?: number;
  rowsApplied?: number;
  rowsSkipped?: number;
  durationMs?: number;
  triggeredById?: string;
}): Promise<void> {
  try {
    await db.insert(npdSyncLog).values({
      direction: entry.direction,
      ok: entry.ok,
      error: entry.error?.slice(0, 500) ?? null,
      productsPushed: entry.productsPushed ?? 0,
      tasksPushed: entry.tasksPushed ?? 0,
      rowsApplied: entry.rowsApplied ?? 0,
      rowsSkipped: entry.rowsSkipped ?? 0,
      durationMs: entry.durationMs ?? null,
      triggeredById: entry.triggeredById ?? null,
    });
  } catch {
    // Never let an audit-log failure take down the operation it was auditing.
  }
}

export async function latestSync(): Promise<{
  at: Date;
  direction: string;
  ok: boolean;
  rows: number;
  error: string | null;
} | null> {
  const [row] = await db
    .select()
    .from(npdSyncLog)
    .orderBy(desc(npdSyncLog.createdAt))
    .limit(1);
  if (!row) return null;
  return {
    at: row.createdAt,
    direction: row.direction,
    ok: row.ok,
    rows: row.productsPushed + row.tasksPushed + row.rowsApplied,
    error: row.error,
  };
}

/** Push several products at once (used by bulk edits in the tracker). */
export async function pushProducts(productIds: string[]): Promise<void> {
  const unique = [...new Set(productIds)];
  if (!unique.length || !isSheetSyncEnabled()) return;

  const [ctx, products, tasks] = await Promise.all([
    loadCtx(),
    db.select().from(npdProducts).where(inArray(npdProducts.id, unique)),
    db.select().from(npdTasks).where(inArray(npdTasks.productId, unique)),
  ]);
  const byProduct = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const arr = byProduct.get(t.productId) ?? [];
    arr.push(t);
    byProduct.set(t.productId, arr);
  }
  const started = Date.now();
  const res = await callScript({
    action: "push",
    products: products.map((p) => buildProductRow(p, byProduct.get(p.id) ?? [], ctx)),
    tasks: tasks.map((t) => {
      const p = products.find((x) => x.id === t.productId)!;
      return buildTaskRow(t, p, ctx);
    }),
  });
  await logSync({
    direction: "push",
    ok: res.ok,
    error: res.error,
    productsPushed: res.ok ? products.length : 0,
    tasksPushed: res.ok ? tasks.length : 0,
    durationMs: Date.now() - started,
  });
}
