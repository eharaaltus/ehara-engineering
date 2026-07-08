import { describe, it, expect } from "vitest";
import { computePortfolio, type NpdTaskLite, type NpdProductLite } from "@/lib/npd/dashboard";
import { addDaysISO } from "@/lib/npd/status";

function today(offset: number): string {
  // Deterministic relative dates for overdue/upcoming assertions.
  return addDaysISO(new Date().toISOString().slice(0, 10), offset);
}

const products: NpdProductLite[] = [
  { id: "p1", partName: "Bracket A", partNo: "BR-1", customer: "M&M", status: "Active", targetEndDate: today(30) },
  { id: "p2", partName: "Bracket B", partNo: "BR-2", customer: "M&M", status: "Completed", targetEndDate: today(-10) },
];

const tasks: NpdTaskLite[] = [
  // p1: one done, one overdue, one due-soon, one N/A, one on-hold
  { productId: "p1", stage: "TECHNICAL", code: "T1", activityPlan: "RFQ", plannedDate: today(-5), resolution: "Done", completionDate: today(-5), applicability: "Applicable", doerName: "Chintan" },
  { productId: "p1", stage: "TECHNICAL", code: "T2", activityPlan: "2D", plannedDate: today(-3), resolution: "Open", completionDate: null, applicability: "Applicable", doerName: "Sachin" },
  { productId: "p1", stage: "COMMERCIAL", code: "C1", activityPlan: "Design", plannedDate: today(7), resolution: "Open", completionDate: null, applicability: "Applicable", doerName: "Chintan" },
  { productId: "p1", stage: "COMMERCIAL", code: "C2", activityPlan: "FTG", plannedDate: today(9), resolution: "Open", completionDate: null, applicability: "N/A", doerName: "Sachin" },
  { productId: "p1", stage: "COMMERCIAL", code: "C3", activityPlan: "Blank", plannedDate: today(5), resolution: "On Hold", completionDate: null, applicability: "On Hold", doerName: "Sachin" },
  // p2: all done
  { productId: "p2", stage: "TECHNICAL", code: "T1", activityPlan: "RFQ", plannedDate: today(-20), resolution: "Done", completionDate: today(-18), applicability: "Applicable", doerName: "Chintan" },
];

describe("computePortfolio", () => {
  const p = computePortfolio(products, tasks, { upcomingDays: 14 });

  it("counts products + status", () => {
    expect(p.kpis.totalProducts).toBe(2);
    expect(p.kpis.completed).toBe(1);
    expect(p.kpis.active).toBe(1);
  });

  it("counts applicable/done/overdue activities (N/A excluded)", () => {
    // 6 tasks, 1 is N/A → 5 applicable
    expect(p.kpis.applicableActivities).toBe(5);
    expect(p.kpis.completedActivities).toBe(2); // p1 T1 + p2 T1
    expect(p.kpis.overdueActivities).toBe(1); // p1 T2
    expect(p.kpis.onHoldActivities).toBe(1); // p1 C3
  });

  it("stage completion excludes N/A and reconciles", () => {
    const tech = p.stageCompletion.find((s) => s.stage === "TECHNICAL")!;
    expect(tech.applicable).toBe(3);
    expect(tech.done).toBe(2);
    expect(tech.overdue).toBe(1);
    const comm = p.stageCompletion.find((s) => s.stage === "COMMERCIAL")!;
    expect(comm.applicable).toBe(2); // C1 + C3 (C2 is N/A)
  });

  it("doer workload splits done/overdue/open", () => {
    const chintan = p.doerWorkload.find((d) => d.doer === "Chintan")!;
    expect(chintan.done).toBe(2); // p1 T1, p2 T1
    const sachin = p.doerWorkload.find((d) => d.doer === "Sachin")!;
    expect(sachin.overdue).toBe(1); // p1 T2
  });

  it("upcoming lists due-soon, overdue lists late", () => {
    expect(p.overdue.map((a) => a.code)).toContain("T2");
    expect(p.upcoming.map((a) => a.code)).toContain("C1");
    // On-hold + N/A never appear in either list
    expect([...p.overdue, ...p.upcoming].map((a) => a.code)).not.toContain("C3");
    expect([...p.overdue, ...p.upcoming].map((a) => a.code)).not.toContain("C2");
  });

  it("D2/D3 — delay-days sum by stage + portfolio total", () => {
    // T2 (TECHNICAL) is overdue by ~3 days; nothing else is overdue.
    const tech = p.stageBottleneck.find((s) => s.stage === "TECHNICAL")!;
    expect(tech.overdue).toBe(1);
    expect(tech.delayDays).toBe(3);
    expect(tech.worstCode).toBe("T2");
    expect(p.kpis.totalDelayDays).toBe(3);
    // bottleneck ranking sorts by delay-days desc → TECHNICAL first
    expect(p.stageBottleneck[0]!.stage).toBe("TECHNICAL");
  });

  it("D4 — internal vs customer delay split (T2 is internal)", () => {
    expect(p.delaySource.internal).toBe(1);
    expect(p.delaySource.internalDelayDays).toBe(3);
    expect(p.delaySource.customer).toBe(0);
  });

  it("D5 — per-product comparison carries delay-days + bottleneck", () => {
    const p1 = p.perProduct.find((x) => x.id === "p1")!;
    expect(p1.delayDays).toBe(3);
    expect(p1.overdue).toBe(1);
    expect(p1.bottleneckStage).toBe("Technical");
    // enriched activity list is present for client-side drill-down
    expect(p.activities.length).toBe(6);
  });
});
