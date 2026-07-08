"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdProducts, npdTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth/current";
import { NPD_ACTIVITIES } from "@/lib/npd/template";
import { addDaysISO } from "@/lib/npd/status";

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
  const me = await requireUser();
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

  const [prod] = await db
    .insert(npdProducts)
    .values({
      srNo,
      customer: str(formData.get("customer")),
      partName,
      partNo: str(formData.get("partNo")),
      startDate: start,
      targetEndDate: str(formData.get("targetEndDate")),
      defaultDoerId: doerId,
      defaultSupervisorId: supervisorId,
      status: "Active",
    })
    .returning();

  if (!prod) throw new Error("Could not create the NPD product. Please try again.");

  const base = start ?? new Date().toISOString().slice(0, 10);
  await db.insert(npdTasks).values(
    NPD_ACTIVITIES.map((a, i) => ({
      productId: prod.id,
      stage: a.stage as (typeof NPD_ACTIVITIES)[number]["stage"] as never,
      code: a.code,
      activityPlan: a.activityPlan,
      doerId,
      supervisorId,
      plannedDate: addDaysISO(base, a.offsetDays),
      sortOrder: i,
    })),
  );

  revalidatePath("/npd");
  redirect(`/npd/${prod.id}`);
}

export async function updateNpdTask(formData: FormData): Promise<void> {
  await requireUser();
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
    })
    .where(eq(npdTasks.id, id));

  if (productId) revalidatePath(`/npd/${productId}`);
  revalidatePath("/npd");
}

/** Edit a product's header fields (customer, part name/no, dates, doer/supervisor). */
export async function updateNpdProduct(formData: FormData): Promise<ActionResult> {
  await requireUser();
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
      })
      .where(eq(npdProducts.id, id));
  } catch (err) {
    return { ok: false, error: `DB: ${err instanceof Error ? err.message : String(err)}` };
  }
  revalidatePath("/npd");
  revalidatePath(`/npd/${id}`);
  return { ok: true };
}

/** Archive / unarchive a product (soft — its activities are kept). */
export async function setNpdArchived(id: string, archived: boolean): Promise<ActionResult> {
  await requireUser();
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
  await requireUser();
  if (!id) return { ok: false, error: "Missing product id" };
  try {
    await db.delete(npdProducts).where(eq(npdProducts.id, id)); // npd_tasks cascade
  } catch (err) {
    return { ok: false, error: `DB: ${err instanceof Error ? err.message : String(err)}` };
  }
  revalidatePath("/npd");
  return { ok: true };
}
