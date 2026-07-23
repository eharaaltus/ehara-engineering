import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdProducts, npdTasks, employees, holidays } from "@/db/schema";
import { buildProduct, type ActivityInput, type Product, type ProductInput } from "@/lib/npd/model";
import { makeCalendar } from "@/lib/npd/workdays";

/**
 * Load the whole NPD portfolio, fully derived, in three queries.
 *
 * Every NPD screen calls this and nothing else, so status is computed in exactly
 * one place. The holiday calendar is loaded here (not in the components) because
 * "days left" must mean the same number on the server, in the browser, and in
 * the Google Sheet.
 */
export async function loadPortfolio(): Promise<Product[]> {
  const [products, tasks, emps, hols] = await Promise.all([
    db.select().from(npdProducts),
    db.select().from(npdTasks),
    db.select({ id: employees.id, name: employees.name }).from(employees),
    db.select({ d: holidays.holidayDate }).from(holidays).where(eq(holidays.isActive, true)),
  ]);

  const nameById = new Map(emps.map((e) => [e.id, e.name]));
  const cal = makeCalendar(hols.map((h) => h.d));

  const byProduct = new Map<string, ActivityInput[]>();
  for (const t of tasks) {
    const a: ActivityInput = {
      id: t.id,
      productId: t.productId,
      stage: t.stage,
      code: t.code,
      activityPlan: t.activityPlan,
      plannedDate: t.plannedDate,
      // A product created before baselines existed has no frozen plan. Fall back
      // to the live planned date so slip reads 0 rather than a fictional number —
      // "we don't know" is the honest answer, not "it's fine".
      baselineDate: t.baselineDate ?? t.plannedDate,
      resolution: t.resolution,
      completionDate: t.completionDate,
      applicability: t.applicability,
      drawingLink: t.drawingLink,
      reasons: t.reasons,
      doerId: t.doerId,
      doerName: t.doerId ? nameById.get(t.doerId) ?? null : null,
      supervisorName: t.supervisorId ? nameById.get(t.supervisorId) ?? null : null,
      sortOrder: t.sortOrder,
    };
    const arr = byProduct.get(t.productId) ?? [];
    arr.push(a);
    byProduct.set(t.productId, arr);
  }

  return products
    .map((p) => {
      const input: ProductInput = {
        id: p.id,
        srNo: p.srNo,
        partName: p.partName,
        partNo: p.partNo,
        customer: p.customer,
        status: p.status,
        archived: p.archived,
        startDate: p.startDate,
        targetEndDate: p.targetEndDate,
        baselineEndDate: p.baselineEndDate ?? p.targetEndDate,
        defaultDoerName: p.defaultDoerId ? nameById.get(p.defaultDoerId) ?? null : null,
        defaultSupervisorName: p.defaultSupervisorId ? nameById.get(p.defaultSupervisorId) ?? null : null,
      };
      return buildProduct(input, byProduct.get(p.id) ?? [], cal);
    })
    .sort((a, b) => (a.srNo ?? 1e9) - (b.srNo ?? 1e9));
}

/** One fully-derived product, or null. Same compute path as the portfolio, so
 *  the detail page can never disagree with the list it was reached from. */
export async function loadProduct(id: string): Promise<Product | null> {
  const [product] = await db.select().from(npdProducts).where(eq(npdProducts.id, id));
  if (!product) return null;

  const [tasks, emps, hols] = await Promise.all([
    db.select().from(npdTasks).where(eq(npdTasks.productId, id)),
    db.select({ id: employees.id, name: employees.name }).from(employees),
    db.select({ d: holidays.holidayDate }).from(holidays).where(eq(holidays.isActive, true)),
  ]);
  const nameById = new Map(emps.map((e) => [e.id, e.name]));
  const cal = makeCalendar(hols.map((h) => h.d));

  const activities: ActivityInput[] = tasks.map((t) => ({
    id: t.id,
    productId: t.productId,
    stage: t.stage,
    code: t.code,
    activityPlan: t.activityPlan,
    plannedDate: t.plannedDate,
    baselineDate: t.baselineDate ?? t.plannedDate,
    resolution: t.resolution,
    completionDate: t.completionDate,
    applicability: t.applicability,
    drawingLink: t.drawingLink,
    reasons: t.reasons,
    doerId: t.doerId,
    doerName: t.doerId ? nameById.get(t.doerId) ?? null : null,
    supervisorName: t.supervisorId ? nameById.get(t.supervisorId) ?? null : null,
    sortOrder: t.sortOrder,
  }));

  const input: ProductInput = {
    id: product.id,
    srNo: product.srNo,
    partName: product.partName,
    partNo: product.partNo,
    customer: product.customer,
    status: product.status,
    archived: product.archived,
    startDate: product.startDate,
    targetEndDate: product.targetEndDate,
    baselineEndDate: product.baselineEndDate ?? product.targetEndDate,
    defaultDoerName: product.defaultDoerId ? nameById.get(product.defaultDoerId) ?? null : null,
    defaultSupervisorName: product.defaultSupervisorId ? nameById.get(product.defaultSupervisorId) ?? null : null,
  };
  return buildProduct(input, activities, cal);
}

export async function loadEmployees(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: employees.id, name: employees.name }).from(employees).orderBy(employees.name);
}
