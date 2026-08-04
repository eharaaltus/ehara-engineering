"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdTasks, npdProducts, holidays } from "@/db/schema";
import { requireModuleAccess } from "@/lib/auth/module-access";
import { addWorkdays, makeCalendar, todayISO } from "@/lib/npd/workdays";

export type Result = { ok: true; message: string } | { ok: false; error: string };

async function calendar() {
  const hols = await db
    .select({ d: holidays.holidayDate })
    .from(holidays)
    .where(eq(holidays.isActive, true));
  return makeCalendar(hols.map((h) => h.d));
}

function revalidate() {
  revalidatePath("/npd");
  revalidatePath("/npd/tracker");
}

// ── Inline edit of a single cell ────────────────────────────────────────────

export type Field =
  | "resolution"
  | "applicability"
  | "plannedDate"
  | "completionDate"
  | "doerId"
  | "supervisorId"
  | "drawingLink"
  | "reasons";

/**
 * Update one field of one activity.
 *
 * `resolution` and `completionDate` are deliberately coupled here rather than
 * left to the caller: marking Done stamps today if no date is given, and moving
 * OFF Done clears the date. If that invariant is not enforced in one place, a
 * re-opened activity keeps its old completion date and every status calculation
 * downstream keeps insisting it is Done.
 */
export async function updateActivity(id: string, field: Field, value: string | null): Promise<Result> {
  await requireModuleAccess("npd");

  const [existing] = await db.select().from(npdTasks).where(eq(npdTasks.id, id));
  if (!existing) return { ok: false, error: "Activity not found" };

  const v = value?.trim() || null;
  const patch: Partial<typeof npdTasks.$inferInsert> = {
    updatedAt: new Date(),
  };

  switch (field) {
    case "resolution": {
      const r = (v ?? "Open") as "Open" | "Done" | "On Hold";
      patch.resolution = r;
      patch.completionDate = r === "Done" ? existing.completionDate ?? todayISO() : null;
      break;
    }
    case "completionDate":
      patch.completionDate = v;
      // Typing a completion date IS marking it done — anything else is a lie the
      // status column then has to tell.
      if (v) patch.resolution = "Done";
      break;
    case "applicability":
      patch.applicability = (v ?? "Applicable") as "Applicable" | "N/A" | "On Hold";
      break;
    case "plannedDate":
      patch.plannedDate = v;
      break;
    case "doerId":
      patch.doerId = v;
      break;
    case "supervisorId":
      patch.supervisorId = v;
      break;
    case "drawingLink":
      patch.drawingLink = v;
      break;
    case "reasons":
      patch.reasons = v;
      break;
  }

  await db.update(npdTasks).set(patch).where(eq(npdTasks.id, id));
  revalidate();
  return { ok: true, message: "Saved" };
}

// ── Bulk actions ───────────────────────────────────────────────────────────

export async function bulkSetResolution(
  ids: string[],
  resolution: "Open" | "Done" | "On Hold",
): Promise<Result> {
  await requireModuleAccess("npd");
  if (!ids.length) return { ok: false, error: "Nothing selected" };

  await db
    .update(npdTasks)
    .set({
      resolution,
      completionDate: resolution === "Done" ? todayISO() : null,
      updatedAt: new Date(),
    })
    .where(inArray(npdTasks.id, ids));

  revalidate();
  return { ok: true, message: `${ids.length} activit${ids.length === 1 ? "y" : "ies"} set to ${resolution}` };
}

export async function bulkSetApplicability(
  ids: string[],
  applicability: "Applicable" | "N/A" | "On Hold",
  reason: string | null,
): Promise<Result> {
  await requireModuleAccess("npd");
  if (!ids.length) return { ok: false, error: "Nothing selected" };

  // Marking something N/A or On Hold silently removes it from every denominator
  // in the app. That MUST come with a reason or the numbers become unauditable
  // six months later when nobody remembers why the bracket skipped plating.
  if (applicability !== "Applicable" && !reason?.trim()) {
    return { ok: false, error: `A reason is required to mark activities “${applicability}”.` };
  }

  await db
    .update(npdTasks)
    .set({
      applicability,
      reasons: reason?.trim() || null,
      updatedAt: new Date(),
    })
    .where(inArray(npdTasks.id, ids));

  revalidate();
  return { ok: true, message: `${ids.length} activit${ids.length === 1 ? "y" : "ies"} set to ${applicability}` };
}

export async function bulkAssign(
  ids: string[],
  role: "doer" | "supervisor",
  employeeId: string | null,
): Promise<Result> {
  await requireModuleAccess("npd");
  if (!ids.length) return { ok: false, error: "Nothing selected" };

  await db
    .update(npdTasks)
    .set({
      ...(role === "doer" ? { doerId: employeeId } : { supervisorId: employeeId }),
      updatedAt: new Date(),
    })
    .where(inArray(npdTasks.id, ids));

  revalidate();
  return { ok: true, message: `Reassigned ${ids.length} activit${ids.length === 1 ? "y" : "ies"}` };
}

/**
 * Shift planned dates by N WORKING days — the single most valuable action in the
 * whole app.
 *
 * When a tool delivery slips two weeks, the real work is re-dating the fourteen
 * activities behind it. In the spreadsheet that is fourteen manual edits, each
 * one an opportunity to typo, and the reason is recorded nowhere. Here it is one
 * action, in working days (so it never lands a plan on a Sunday), with a
 * mandatory reason written to every row it touches.
 *
 * `baselineDate` is deliberately NOT shifted. That is the entire point: the
 * frozen promise stays frozen, and the gap it opens up is the slip you can now
 * finally see.
 */
export async function bulkShiftDates(
  ids: string[],
  days: number,
  reason: string,
): Promise<Result> {
  await requireModuleAccess("npd");
  if (!ids.length) return { ok: false, error: "Nothing selected" };
  if (!Number.isFinite(days) || days === 0) return { ok: false, error: "Enter a non-zero number of days" };
  if (!reason.trim()) {
    return { ok: false, error: "A reason is required — re-planning without one is how slip becomes invisible." };
  }

  const cal = await calendar();
  const rows = await db.select().from(npdTasks).where(inArray(npdTasks.id, ids));

  // Each row lands on its own new date, so this can't collapse into one
  // statement — but it must not be a sequential await either. Shifting 14
  // activities was 14 serialised round trips; issuing them together turns that
  // into roughly one round trip's wall-clock. The pool (max 18) absorbs the
  // fan-out, and a partial failure is no worse than the serial version's.
  const movable = rows.filter((t) => t.plannedDate);
  const now = new Date();
  await Promise.all(
    movable.map((t) =>
      db
        .update(npdTasks)
        .set({
          plannedDate: addWorkdays(t.plannedDate!, days, cal),
          reasons: reason.trim(),
          updatedAt: now,
        })
        .where(eq(npdTasks.id, t.id)),
    ),
  );
  const moved = movable.length;

  revalidate();
  return {
    ok: true,
    message: `Shifted ${moved} activit${moved === 1 ? "y" : "ies"} by ${days > 0 ? "+" : ""}${days} working day${Math.abs(days) === 1 ? "" : "s"}`,
  };
}

/**
 * Cascade reschedule: one activity slips, so everything planned AFTER it in the
 * same product moves with it.
 *
 * Returns a preview when `apply` is false. Never shifts silently — a schedule
 * that rearranges itself behind your back is worse than one that doesn't move at
 * all, because you stop believing any date in it.
 */
export async function cascadeReschedule(
  anchorId: string,
  days: number,
  reason: string,
  apply: boolean,
): Promise<
  | { ok: true; preview: { id: string; code: string; activityPlan: string; from: string; to: string }[]; applied: boolean }
  | { ok: false; error: string }
> {
  await requireModuleAccess("npd");
  if (!Number.isFinite(days) || days === 0) return { ok: false, error: "Enter a non-zero number of days" };

  const [anchor] = await db.select().from(npdTasks).where(eq(npdTasks.id, anchorId));
  if (!anchor) return { ok: false, error: "Activity not found" };
  if (!anchor.plannedDate) return { ok: false, error: "This activity has no planned date to cascade from." };

  const cal = await calendar();
  const siblings = await db.select().from(npdTasks).where(eq(npdTasks.productId, anchor.productId));

  // Downstream = anything later in the template order that is still open. Done
  // activities are history and must not be re-dated; N/A ones aren't happening.
  const downstream = siblings
    .filter(
      (t) =>
        t.sortOrder >= anchor.sortOrder &&
        t.plannedDate &&
        t.resolution !== "Done" &&
        t.applicability !== "N/A",
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const preview = downstream.map((t) => ({
    id: t.id,
    code: t.code,
    activityPlan: t.activityPlan,
    from: t.plannedDate!,
    to: addWorkdays(t.plannedDate!, days, cal),
  }));

  if (!apply) return { ok: true, preview, applied: false };

  if (!reason.trim()) {
    return { ok: false, error: "A reason is required before shifting a schedule." };
  }

  // Issued together rather than one-at-a-time — a cascade routinely touches a
  // dozen-plus activities, and serialising those round trips is what made the
  // action feel like it had hung.
  const stamp = new Date();
  await Promise.all(
    preview.map((p) =>
      db
        .update(npdTasks)
        .set({ plannedDate: p.to, reasons: reason.trim(), updatedAt: stamp })
        .where(eq(npdTasks.id, p.id)),
    ),
  );

  // The product's target date has to move with its last activity, or the
  // portfolio keeps advertising a date the plan itself no longer believes.
  const [product] = await db.select().from(npdProducts).where(eq(npdProducts.id, anchor.productId));
  if (product?.targetEndDate && days > 0) {
    await db
      .update(npdProducts)
      .set({
        targetEndDate: addWorkdays(product.targetEndDate, days, cal),
        updatedAt: new Date(),
      })
      .where(eq(npdProducts.id, anchor.productId));
  }

  revalidate();
  return { ok: true, preview, applied: true };
}
