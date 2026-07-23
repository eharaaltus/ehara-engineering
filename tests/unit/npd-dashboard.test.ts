import { describe, it, expect } from "vitest";
import { buildProduct, type ActivityInput, type ProductInput } from "@/lib/npd/model";
import {
  computeKpis, healthMix, stageDistribution, overdueActivities, upcomingActivities, doerWorkload,
} from "@/lib/npd/insights";
import { addDaysISO } from "@/lib/npd/status";

function today(offset: number): string {
  return addDaysISO(new Date().toISOString().slice(0, 10), offset);
}

function act(o: Partial<ActivityInput> & { productId: string; code: string; stage: string; sortOrder: number }): ActivityInput {
  return {
    id: `${o.productId}-${o.code}`,
    activityPlan: o.code,
    plannedDate: null,
    baselineDate: null,
    resolution: "Open",
    completionDate: null,
    applicability: "Applicable",
    drawingLink: null,
    reasons: null,
    doerId: o.doerName ?? null,
    doerName: null,
    supervisorName: null,
    ...o,
  } as ActivityInput;
}

function product(input: Partial<ProductInput> & { id: string; partName: string }, acts: ActivityInput[]) {
  const p: ProductInput = {
    srNo: 1, partNo: null, customer: "M&M", status: "Active", archived: false,
    startDate: today(-30), targetEndDate: today(30), baselineEndDate: today(30),
    defaultDoerName: null, defaultSupervisorName: null,
    ...input,
  };
  return buildProduct(p, acts);
}

// p1: T1 done, T2 overdue (Chintan), C1 due-soon, C2 N/A, C3 on-hold
const p1 = product({ id: "p1", partName: "Bracket A" }, [
  act({ productId: "p1", stage: "TECHNICAL", code: "T1", sortOrder: 0, resolution: "Done", completionDate: today(-5), plannedDate: today(-5), baselineDate: today(-5), doerId: "Chintan", doerName: "Chintan" }),
  act({ productId: "p1", stage: "TECHNICAL", code: "T2", sortOrder: 1, plannedDate: today(-3), baselineDate: today(-3), doerId: "Chintan", doerName: "Chintan" }),
  act({ productId: "p1", stage: "COMMERCIAL", code: "C1", sortOrder: 2, plannedDate: today(6), baselineDate: today(6), doerId: "Sachin", doerName: "Sachin" }),
  act({ productId: "p1", stage: "COMMERCIAL", code: "C2", sortOrder: 3, applicability: "N/A", plannedDate: today(9), baselineDate: today(9), doerId: "Sachin", doerName: "Sachin" }),
  act({ productId: "p1", stage: "COMMERCIAL", code: "C3", sortOrder: 4, resolution: "On Hold", applicability: "On Hold", plannedDate: today(5), baselineDate: today(5), doerId: "Sachin", doerName: "Sachin" }),
]);

// p2: all done
const p2 = product({ id: "p2", partName: "Bracket B", status: "Completed" }, [
  act({ productId: "p2", stage: "TECHNICAL", code: "T1", sortOrder: 0, resolution: "Done", completionDate: today(-18), plannedDate: today(-20), baselineDate: today(-20), doerId: "Chintan", doerName: "Chintan" }),
]);

const products = [p1, p2];

describe("NPD dashboard insights", () => {
  it("KPIs count parts + applicable/done/overdue (N/A excluded)", () => {
    const k = computeKpis(products);
    expect(k.activeParts).toBe(2);
    // p1: applicable = T1,T2,C1,C3 (C2 N/A) = 4 ; done = T1 ; overdue = T2
    // p2: applicable = 1 done
    expect(k.overdueActivities).toBe(1);
    expect(k.onHold).toBe(1); // p1 C3
  });

  it("health mix sums to product count", () => {
    const mix = healthMix(products);
    expect(mix.reduce((s, m) => s + m.count, 0)).toBe(2);
  });

  it("stage distribution excludes N/A and finds the bottleneck", () => {
    const { bars, bottleneck } = stageDistribution(products);
    const tech = bars.find((b) => b.stage === "TECHNICAL")!;
    expect(tech.overdueActs).toBe(1); // T2
    // p1 sits in TECHNICAL (T2 open) → that's the WIP bottleneck here
    expect(bottleneck).toBe("TECHNICAL");
  });

  it("overdue lists the late activity; on-hold + N/A never appear", () => {
    const overdue = overdueActivities(products).map((a) => a.code);
    expect(overdue).toContain("T2");
    expect(overdue).not.toContain("C3");
    expect(overdue).not.toContain("C2");
  });

  it("upcoming lists due-soon, never on-hold or N/A", () => {
    const upcoming = upcomingActivities(products, 14).map((a) => a.code);
    expect(upcoming).toContain("C1");
    expect(upcoming).not.toContain("C3");
    expect(upcoming).not.toContain("C2");
  });

  it("doer workload attributes overdue to the right person", () => {
    const loads = doerWorkload(products);
    const chintan = loads.find((l) => l.doerName === "Chintan");
    // Chintan owns T2 (overdue). T1 is done so not counted as open.
    expect(chintan?.overdue).toBe(1);
  });
});
