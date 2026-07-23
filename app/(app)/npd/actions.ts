"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdProducts, npdTasks, holidays } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";
import { NPD_ACTIVITIES } from "@/lib/npd/template";
import { addWorkdays, makeCalendar } from "@/lib/npd/workdays";
import { deleteFromSheet, pushProduct } from "@/lib/npd/sheet-sync";

type ActionResult = { ok: true } | { ok: false; error: string };

function str(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s || null;
}
function int(v: FormDataEntryValue | null): number | null {
  const n = v ? parseInt(String(v), 10) : NaN;
  return Number.isNaN(n) ? null : n;
}

export async function createNpdProduct(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const partName = str(formData.get("partName"));
  if (!partName) throw new Error("Part name is required");

  const start = str(formData.get("startDate"));
  const doerId = str(formData.get("defaultDoerId")) ?? me.id;
  const supervisorId = str(formData.get("defaultSupervisorId")) ?? doerId;

  // Product number = srNo. Auto-assign the next number if none supplied so
  // every product is searchable by a stable number.
  let srNo = int(formData.get("srNo"));
  if (srNo == null) {
    const rows = await db
      .select({ next: sql<number>`coalesce(max(${npdProducts.srNo}), 0) + 1` })
      .from(npdProducts);
    srNo = rows[0]?.next ?? 1;
  }

  // The activity template's offsets are WORKING-day offsets, so a product that
  // starts the week of a festival no longer front-loads three activities onto
  // days nobody is in the building. Uses the same company holiday calendar the
  // rest of the app does.
  const hols = await db
    .select({ d: holidays.holidayDate })
    .from(holidays)
    .where(eq(holidays.isActive, true));
  const cal = makeCalendar(hols.map((h) => h.d));

  const base = start ?? new Date().toISOString().slice(0, 10);
  const planned = NPD_ACTIVITIES.map((a) => addWorkdays(base, a.offsetDays, cal));
  const derivedEnd = planned[planned.length - 1] ?? base;
  const targetEndDate = str(formData.get("targetEndDate")) ?? derivedEnd;

  const [prod] = await db
    .insert(npdProducts)
    .values({
      srNo,
      customer: str(formData.get("customer")),
      partName,
      partNo: str(formData.get("partNo")),
      startDate: start,
      targetEndDate,
      // Freeze the promise. `targetEndDate` can be re-planned later; this cannot.
      // The gap between them is the product's schedule variance — and without
      // this one column it is permanently unknowable, because re-planning
      // overwrites the only record of what you originally committed to.
      baselineEndDate: targetEndDate,
      defaultDoerId: doerId,
      defaultSupervisorId: supervisorId,
      status: "Active",
    })
    .returning();

  if (!prod) throw new Error("Could not create the NPD product. Please try again.");

  await db.insert(npdTasks).values(
    NPD_ACTIVITIES.map((a, i) => ({
      productId: prod.id,
      stage: a.stage as (typeof NPD_ACTIVITIES)[number]["stage"] as never,
      code: a.code,
      activityPlan: a.activityPlan,
      doerId,
      supervisorId,
      plannedDate: planned[i]!,
      baselineDate: planned[i]!, // frozen at birth, never edited again
      sortOrder: i,
    })),
  );

  // Mirror into the Google Sheet. Best-effort: a sheet outage must never lose
  // the user their product.
  try {
    await pushProduct(prod.id);
  } catch {
    /* pushProduct logs its own failures to npd_sync_log */
  }

  revalidatePath("/npd");
  revalidatePath("/npd/tracker");
  redirect(`/npd/${prod.id}`);
}

export async function updateNpdTask(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData.get("id"));
  const productId = str(formData.get("productId"));
  if (!id) throw new Error("Missing task id");

  const resolution = (str(formData.get("resolution")) ?? "Open") as "Open" | "Done" | "On Hold";
  const explicitCompletion = str(formData.get("completionDate"));
  // Completion date is tied to "Done". Re-opening (Open / On Hold) MUST clear it,
  // otherwise computeNpd still reads a stale completionDate and the row stays
  // stuck showing "✓ Done".
  const completionDate =
    resolution === "Done" ? explicitCompletion ?? new Date().toISOString().slice(0, 10) : null;

  await db
    .update(npdTasks)
    .set({
      resolution,
      applicability: (str(formData.get("applicability")) ?? "Applicable") as never,
      completionDate,
      plannedDate: str(formData.get("plannedDate")),
      doerId: str(formData.get("doerId")),
      drawingLink: str(formData.get("drawingLink")),
      reasons: str(formData.get("reasons")),
      updatedAt: new Date(),
      updatedSource: "app",
    })
    .where(eq(npdTasks.id, id));

  if (productId) {
    try {
      await pushProduct(productId);
    } catch {
      /* mirror is best-effort; the DB already has the truth */
    }
    revalidatePath(`/npd/${productId}`);
  }
  revalidatePath("/npd");
  revalidatePath("/npd/tracker");
}

/** Edit a product's header fields (customer, part name/no, dates, doer/supervisor). */
export async function updateNpdProduct(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) return { ok: false, error: "Missing product id" };
  const partName = str(formData.get("partName"));
  if (!partName) return { ok: false, error: "Part name is required" };

  try {
    await db
      .update(npdProducts)
      .set({
        srNo: int(formData.get("srNo")),
        customer: str(formData.get("customer")),
        partName,
        partNo: str(formData.get("partNo")),
        startDate: str(formData.get("startDate")),
        targetEndDate: str(formData.get("targetEndDate")),
        defaultDoerId: str(formData.get("defaultDoerId")),
        defaultSupervisorId: str(formData.get("defaultSupervisorId")),
        updatedAt: new Date(),
        updatedSource: "app",
        // `baselineEndDate` is deliberately absent. Editing a product must never
        // move the frozen commitment — that is the whole reason it exists.
      })
      .where(eq(npdProducts.id, id));
  } catch (err) {
    return { ok: false, error: `DB: ${err instanceof Error ? err.message : String(err)}` };
  }
  try {
    await pushProduct(id);
  } catch {
    /* best-effort mirror */
  }
  revalidatePath("/npd");
  revalidatePath("/npd/tracker");
  revalidatePath(`/npd/${id}`);
  return { ok: true };
}

/**
 * Duplicate a product and its 36 activities.
 *
 * Copies the whole plan — dates, doers, applicability, the frozen baseline — but
 * RESETS progress: every activity comes back Open with no completion date. The
 * result is a clean new run of a proven schedule, which is exactly how NPD reuse
 * works: "make me another one like the Gearbox Bracket, same plan, nothing done
 * yet."
 */
export async function duplicateNpdProduct(id: string): Promise<ActionResult & { newId?: string }> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Missing product id" };

  try {
    const [src] = await db.select().from(npdProducts).where(eq(npdProducts.id, id));
    if (!src) return { ok: false, error: "Product not found" };
    const srcTasks = await db.select().from(npdTasks).where(eq(npdTasks.productId, id));

    const nextRows = await db
      .select({ next: sql<number>`coalesce(max(${npdProducts.srNo}), 0) + 1` })
      .from(npdProducts);
    const next = nextRows[0]?.next ?? null;

    const [copy] = await db
      .insert(npdProducts)
      .values({
        srNo: next,
        customer: src.customer,
        partName: `${src.partName} (copy)`,
        partNo: src.partNo,
        startDate: src.startDate,
        targetEndDate: src.targetEndDate,
        baselineEndDate: src.baselineEndDate,
        defaultDoerId: src.defaultDoerId,
        defaultSupervisorId: src.defaultSupervisorId,
        status: "Active",
      })
      .returning();
    if (!copy) return { ok: false, error: "Could not create the copy" };

    if (srcTasks.length) {
      await db.insert(npdTasks).values(
        srcTasks.map((t) => ({
          productId: copy.id,
          stage: t.stage,
          code: t.code,
          activityPlan: t.activityPlan,
          doerId: t.doerId,
          supervisorId: t.supervisorId,
          plannedDate: t.plannedDate,
          baselineDate: t.baselineDate,
          drawingLink: t.drawingLink,
          applicability: t.applicability,
          sortOrder: t.sortOrder,
          // progress reset — a duplicate is a fresh run of the same plan
          resolution: "Open" as const,
          completionDate: null,
          reasons: null,
        })),
      );
    }

    try {
      await pushProduct(copy.id);
    } catch {
      /* best-effort mirror */
    }
    revalidatePath("/npd");
    revalidatePath("/npd/tracker");
    return { ok: true, newId: copy.id };
  } catch (err) {
    return { ok: false, error: `DB: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Archive / unarchive a product (soft — its activities are kept). */
export async function setNpdArchived(id: string, archived: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Missing product id" };
  try {
    await db.update(npdProducts).set({ archived, updatedAt: new Date() }).where(eq(npdProducts.id, id));
  } catch (err) {
    return { ok: false, error: `DB: ${err instanceof Error ? err.message : String(err)}` };
  }
  revalidatePath("/npd");
  return { ok: true };
}

/** Permanently delete a product AND its activities (FK cascade). Explicit, hard
 *  delete — the UI must confirm. Prefer Archive to avoid data loss. */
export async function deleteNpdProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Missing product id" };

  // Collect the activity UIDs BEFORE the cascade removes them — afterwards there
  // is nothing left to tell the sheet to delete, and its rows would linger as
  // orphans that no future sync could ever match or clean up.
  const taskIds = await db
    .select({ id: npdTasks.id })
    .from(npdTasks)
    .where(eq(npdTasks.productId, id));

  try {
    await db.delete(npdProducts).where(eq(npdProducts.id, id)); // npd_tasks cascade
  } catch (err) {
    return { ok: false, error: `DB: ${err instanceof Error ? err.message : String(err)}` };
  }

  try {
    await deleteFromSheet([id, ...taskIds.map((t) => t.id)]);
  } catch {
    /* best-effort mirror */
  }

  revalidatePath("/npd");
  revalidatePath("/npd/tracker");
  return { ok: true };
}
