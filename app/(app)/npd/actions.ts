"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdProducts, npdTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth/current";
import { NPD_ACTIVITIES } from "@/lib/npd/template";
import { addDaysISO } from "@/lib/npd/status";

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

  const [prod] = await db
    .insert(npdProducts)
    .values({
      srNo: int(formData.get("srNo")),
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
  const completionDate =
    resolution === "Done" ? explicitCompletion ?? new Date().toISOString().slice(0, 10) : explicitCompletion;

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
