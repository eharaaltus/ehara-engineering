// NPD portfolio aggregation — pure functions over products + tasks, safe on
// server & client. Powers the /npd/dashboard views (D1–D5 equivalents) + the
// click-to-drill-down panels. Uses the same computeNpd/computeHealth state
// machine as the tracker so every number reconciles.
import {
  computeNpd,
  computeHealth,
  computePredictedEnd,
  NPD_STAGES,
  STAGE_SHORT,
  type NpdState,
} from "./status";

/**
 * Activities whose delay is the CUSTOMER's dependency (waiting on the customer),
 * vs internal work. Used by D4's Internal-vs-Customer delay split. Refine to
 * taste — these are the clearly customer-gated steps in the 36-activity plan.
 */
export const CUSTOMER_CODES = new Set([
  "T1", "T9", "C7", "C8", "PS3", "PS5", "PH1", "PH2", "PH4",
]);

export interface NpdTaskLite {
  productId: string;
  stage: string;
  code: string;
  activityPlan: string;
  plannedDate: string | null;
  resolution: string;
  completionDate: string | null;
  applicability: string;
  doerName: string | null;
  supervisorName?: string | null;
  reasons?: string | null;
}

export interface NpdProductLite {
  id: string;
  srNo?: number | null;
  partName: string;
  partNo: string | null;
  customer: string | null;
  status: string;
  startDate?: string | null;
  targetEndDate: string | null;
}

/** One activity enriched with its computed state — the atom every drill-down
 *  panel filters over on the client. */
export interface EnrichedActivity {
  productId: string;
  partName: string;
  stage: string;
  stageShort: string;
  code: string;
  activityPlan: string;
  doerName: string | null;
  reasons: string | null;
  plannedDate: string | null;
  completionDate: string | null;
  applicability: string;
  resolution: string;
  state: NpdState;
  stateLabel: string;
  daysLeft: number | null;
  /** abs(daysLeft) when overdue, else 0. */
  delayDays: number;
  customer: boolean;
}

export interface StageCompletion {
  stage: string;
  short: string;
  done: number;
  overdue: number;
  remaining: number;
  applicable: number;
  pctDone: number;
}

/** D3 — stage(=department) as a bottleneck: workload + summed delay. */
export interface StageBottleneck {
  stage: string;
  short: string;
  pending: number;
  overdue: number;
  done: number;
  applicable: number;
  delayDays: number; // Σ overdue days across the stage
  worstCode: string | null;
  worstDelay: number;
  risk: "Critical" | "At Risk" | "Clear";
}

export interface DoerWorkload {
  doer: string;
  done: number;
  overdue: number;
  open: number;
  total: number;
}

/** D5 — one comparison row per product. */
export interface ProductProgress {
  id: string;
  partName: string;
  partNo: string | null;
  customer: string | null;
  status: string;
  health: "Good" | "At Risk" | "Critical";
  total: number; // applicable activities
  done: number;
  overdue: number;
  onHold: number;
  pending: number; // applicable - done - overdue - onHold
  percentDone: number;
  delayDays: number; // Σ overdue days
  maxDelayDays: number;
  predictedEnd: string | null;
  targetEndDate: string | null;
  bottleneckStage: string | null;
}

/** Per-customer rollup (an OEM manufacturer tracks NPD by customer). */
export interface CustomerBreakdown {
  customer: string;
  products: number;
  applicable: number;
  done: number;
  overdue: number;
  delayDays: number;
  pctDone: number;
}

export interface UpcomingActivity {
  productId: string;
  partName: string;
  code: string;
  activityPlan: string;
  plannedDate: string;
  daysLeft: number;
  doerName: string | null;
  overdue: boolean;
}

export interface NpdPortfolio {
  kpis: {
    totalProducts: number;
    active: number;
    completed: number;
    avgPercentDone: number;
    applicableActivities: number;
    completedActivities: number;
    overdueActivities: number;
    onHoldActivities: number;
    pendingActivities: number;
    totalDelayDays: number;
    criticalProducts: number;
    atRiskProducts: number;
  };
  healthDist: Slice[];
  statusDist: Slice[];
  stateDist: Slice[]; // done/overdue/on-hold/on-track distribution of activities
  stageCompletion: StageCompletion[];
  stageBottleneck: StageBottleneck[]; // sorted by delayDays desc
  perProduct: ProductProgress[]; // sorted by delayDays desc
  doerWorkload: DoerWorkload[];
  customerBreakdown: CustomerBreakdown[]; // sorted by delayDays desc
  delaySource: { internal: number; customer: number; internalDelayDays: number; customerDelayDays: number };
  /** Completion efficiency — for DONE activities that have both a planned +
   *  completion date: finished early / on the day / late. */
  efficiency: { early: number; onTime: number; late: number; scored: number; avgVarianceDays: number };
  upcoming: UpcomingActivity[];
  overdue: UpcomingActivity[];
  activities: EnrichedActivity[]; // full enriched list for client-side drill-down
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

const HEALTH_COLOR = { Good: "#16a34a", "At Risk": "#d97706", Critical: "#e11d2f" } as const;

export function enrichActivities(
  products: NpdProductLite[],
  tasks: NpdTaskLite[],
): EnrichedActivity[] {
  const nameById = new Map(products.map((p) => [p.id, p.partName]));
  return tasks.map((t) => {
    const c = computeNpd(t);
    const delayDays = c.state === "Overdue" ? Math.abs(c.daysLeft ?? 0) : 0;
    return {
      productId: t.productId,
      partName: nameById.get(t.productId) ?? "—",
      stage: t.stage,
      stageShort: STAGE_SHORT[t.stage] ?? t.stage,
      code: t.code,
      activityPlan: t.activityPlan,
      doerName: t.doerName,
      reasons: t.reasons ?? null,
      plannedDate: t.plannedDate,
      completionDate: t.completionDate,
      applicability: t.applicability,
      resolution: t.resolution,
      state: c.state,
      stateLabel: c.label,
      daysLeft: c.daysLeft,
      delayDays,
      customer: CUSTOMER_CODES.has(t.code),
    };
  });
}

export function computePortfolio(
  products: NpdProductLite[],
  tasks: NpdTaskLite[],
  opts?: { upcomingDays?: number },
): NpdPortfolio {
  const upcomingDays = opts?.upcomingDays ?? 14;
  const acts = enrichActivities(products, tasks);
  const applicableActs = acts.filter((a) => a.state !== "NotApplicable");

  const byProduct = new Map<string, EnrichedActivity[]>();
  for (const a of acts) {
    const arr = byProduct.get(a.productId) ?? [];
    arr.push(a);
    byProduct.set(a.productId, arr);
  }

  // ── Per-product (D5 comparison rows) ──────────────────────────────────────
  const perProduct: ProductProgress[] = products.map((p) => {
    const pa = byProduct.get(p.id) ?? [];
    const h = computeHealth(pa.map(toComputeInput));
    const delayDays = pa.reduce((s, a) => s + a.delayDays, 0);
    // bottleneck stage = the applicable stage with the most delay days.
    const stageDelay = new Map<string, number>();
    for (const a of pa) if (a.delayDays) stageDelay.set(a.stage, (stageDelay.get(a.stage) ?? 0) + a.delayDays);
    let bottleneckStage: string | null = null, best = 0;
    for (const [st, d] of stageDelay) if (d > best) { best = d; bottleneckStage = STAGE_SHORT[st] ?? st; }
    const pending = Math.max(0, h.applicable - h.completed - h.overdue - h.onHold);
    return {
      id: p.id, partName: p.partName, partNo: p.partNo, customer: p.customer, status: p.status,
      health: h.health, total: h.applicable, done: h.completed, overdue: h.overdue,
      onHold: h.onHold, pending, percentDone: h.percentDone, delayDays, maxDelayDays: h.maxDelayDays,
      predictedEnd: computePredictedEnd(pa.map(toComputeInput), p.targetEndDate),
      targetEndDate: p.targetEndDate, bottleneckStage,
    };
  }).sort((a, b) => b.delayDays - a.delayDays);

  // ── Per-stage completion + bottleneck (D2/D3) ─────────────────────────────
  const stageCompletion: StageCompletion[] = [];
  const stageBottleneck: StageBottleneck[] = [];
  for (const stage of NPD_STAGES) {
    const sa = acts.filter((a) => a.stage === stage && a.state !== "NotApplicable");
    const done = sa.filter((a) => a.state === "Done").length;
    const overdue = sa.filter((a) => a.state === "Overdue").length;
    const onHold = sa.filter((a) => a.state === "OnHold").length;
    const applicable = sa.length;
    const pending = Math.max(0, applicable - done - overdue - onHold);
    const delayDays = sa.reduce((s, a) => s + a.delayDays, 0);
    let worstCode: string | null = null, worstDelay = 0;
    for (const a of sa) if (a.delayDays > worstDelay) { worstDelay = a.delayDays; worstCode = a.code; }
    stageCompletion.push({
      stage, short: STAGE_SHORT[stage] ?? stage, done, overdue,
      remaining: pending + onHold, applicable, pctDone: applicable ? Math.round((done / applicable) * 100) : 0,
    });
    stageBottleneck.push({
      stage, short: STAGE_SHORT[stage] ?? stage, pending, overdue, done, applicable, delayDays,
      worstCode, worstDelay,
      risk: overdue >= 3 || delayDays >= 60 ? "Critical" : overdue > 0 ? "At Risk" : "Clear",
    });
  }
  stageBottleneck.sort((a, b) => b.delayDays - a.delayDays);

  // ── Doer workload ─────────────────────────────────────────────────────────
  const doerMap = new Map<string, DoerWorkload>();
  for (const a of applicableActs) {
    const doer = a.doerName?.trim() || "Unassigned";
    const w = doerMap.get(doer) ?? { doer, done: 0, overdue: 0, open: 0, total: 0 };
    w.total++;
    if (a.state === "Done") w.done++;
    else if (a.state === "Overdue") w.overdue++;
    else w.open++;
    doerMap.set(doer, w);
  }
  const doerWorkload = [...doerMap.values()].sort((a, b) => b.total - a.total);

  // ── Per-customer breakdown ────────────────────────────────────────────────
  const custMap = new Map<string, CustomerBreakdown>();
  for (const pp of perProduct) {
    const customer = pp.customer?.trim() || "—";
    const c = custMap.get(customer) ?? { customer, products: 0, applicable: 0, done: 0, overdue: 0, delayDays: 0, pctDone: 0 };
    c.products++;
    c.applicable += pp.total;
    c.done += pp.done;
    c.overdue += pp.overdue;
    c.delayDays += pp.delayDays;
    custMap.set(customer, c);
  }
  const customerBreakdown = [...custMap.values()]
    .map((c) => ({ ...c, pctDone: c.applicable ? Math.round((c.done / c.applicable) * 100) : 0 }))
    .sort((a, b) => b.delayDays - a.delayDays);

  // ── Internal vs Customer delay split (D4) ─────────────────────────────────
  let internal = 0, customer = 0, internalDelayDays = 0, customerDelayDays = 0;
  for (const a of acts) {
    if (a.state !== "Overdue") continue;
    if (a.customer) { customer++; customerDelayDays += a.delayDays; }
    else { internal++; internalDelayDays += a.delayDays; }
  }

  // ── Completion efficiency (D4) — done activities: early / on-time / late ──
  let early = 0, onTime = 0, late = 0, varianceSum = 0, scored = 0;
  for (const a of acts) {
    if (a.state !== "Done" || !a.completionDate || !a.plannedDate) continue;
    scored++;
    const v = daysBetweenISO(a.plannedDate, a.completionDate); // completion − planned (>0 = late)
    varianceSum += v;
    if (v < 0) early++;
    else if (v === 0) onTime++;
    else late++;
  }
  const efficiency = {
    early, onTime, late, scored,
    avgVarianceDays: scored ? Math.round((varianceSum / scored) * 10) / 10 : 0,
  };

  // ── Upcoming + overdue lists ──────────────────────────────────────────────
  const upcoming: UpcomingActivity[] = [];
  const overdue: UpcomingActivity[] = [];
  for (const a of acts) {
    if (!a.plannedDate) continue;
    if (a.state === "Overdue") overdue.push(mkActivity(a, a.daysLeft ?? 0, true));
    else if ((a.state === "OnTrack" || a.state === "DueToday") && a.daysLeft !== null && a.daysLeft <= upcomingDays)
      upcoming.push(mkActivity(a, a.daysLeft, false));
  }
  upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
  overdue.sort((a, b) => a.daysLeft - b.daysLeft);

  // ── KPIs + distributions ──────────────────────────────────────────────────
  const completedActivities = applicableActs.filter((a) => a.state === "Done").length;
  const overdueActivities = applicableActs.filter((a) => a.state === "Overdue").length;
  const onHoldActivities = applicableActs.filter((a) => a.state === "OnHold").length;
  const pendingActivities = applicableActs.length - completedActivities - overdueActivities - onHoldActivities;
  const completed = products.filter((p) => p.status === "Completed").length;
  const avgPercentDone = perProduct.length
    ? Math.round(perProduct.reduce((s, p) => s + p.percentDone, 0) / perProduct.length) : 0;
  const totalDelayDays = perProduct.reduce((s, p) => s + p.delayDays, 0);
  const healthCounts = { Good: 0, "At Risk": 0, Critical: 0 } as Record<ProductProgress["health"], number>;
  for (const p of perProduct) healthCounts[p.health]++;

  return {
    kpis: {
      totalProducts: products.length, active: products.length - completed, completed, avgPercentDone,
      applicableActivities: applicableActs.length, completedActivities, overdueActivities,
      onHoldActivities, pendingActivities, totalDelayDays,
      criticalProducts: healthCounts.Critical, atRiskProducts: healthCounts["At Risk"],
    },
    healthDist: [
      { label: "Good", value: healthCounts.Good, color: HEALTH_COLOR.Good },
      { label: "At Risk", value: healthCounts["At Risk"], color: HEALTH_COLOR["At Risk"] },
      { label: "Critical", value: healthCounts.Critical, color: HEALTH_COLOR.Critical },
    ],
    statusDist: [
      { label: "Active", value: products.length - completed, color: "#1e40af" },
      { label: "Completed", value: completed, color: "#16a34a" },
    ],
    stateDist: [
      { label: "Done", value: completedActivities, color: "#16a34a" },
      { label: "Overdue", value: overdueActivities, color: "#e11d2f" },
      { label: "Pending", value: pendingActivities, color: "#1e40af" },
      { label: "On Hold", value: onHoldActivities, color: "#94a3b8" },
    ],
    stageCompletion, stageBottleneck, perProduct, doerWorkload, customerBreakdown,
    delaySource: { internal, customer, internalDelayDays, customerDelayDays },
    efficiency,
    upcoming, overdue, activities: acts,
  };
}

function daysBetweenISO(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

/* ══════════════ D1 + D2 — single-product deep-dive ══════════════ */
export interface StageDelayRow {
  stage: string; short: string; delayDays: number; delayed: number; applicable: number;
  worstCode: string | null; worstDelay: number; risk: "Critical" | "At Risk" | "Clear";
}
export interface ProductDetail {
  id: string; srNo: number | null; partName: string; partNo: string | null; customer: string | null;
  doerName: string | null; supervisorName: string | null;
  startDate: string | null; targetEndDate: string | null; predictedEnd: string | null;
  status: "Completed" | "Delayed" | "On Track" | "Not Started";
  currentStage: string | null;
  kpis: { total: number; done: number; overdue: number; onTrack: number; onHold: number; pending: number; pctDone: number; delayDays: number };
  keyInsight: string | null;
  stageDelays: StageDelayRow[];   // all stages, sorted by delay desc
  activities: EnrichedActivity[]; // full list, plan order
  statusMix: { onTimeEarly: number; lateCompleted: number; overdue: number; pending: number };
  onHold: EnrichedActivity[];
  remaining: number;              // applicable not-done
}

export function computeProductDetail(
  productId: string,
  products: NpdProductLite[],
  tasks: NpdTaskLite[],
): ProductDetail | null {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  const pa = enrichActivities([product], tasks.filter((t) => t.productId === productId));
  const app = pa.filter((a) => a.state !== "NotApplicable");
  const done = app.filter((a) => a.state === "Done").length;
  const overdue = app.filter((a) => a.state === "Overdue").length;
  const onHold = app.filter((a) => a.state === "OnHold").length;
  const onTrack = app.filter((a) => a.state === "OnTrack" || a.state === "DueToday").length;
  const total = app.length;
  const pending = Math.max(0, total - done - overdue - onHold);
  const delayDays = pa.reduce((s, a) => s + a.delayDays, 0);

  // Per-stage delay rows.
  const stageDelays: StageDelayRow[] = NPD_STAGES.map((stage) => {
    const sa = pa.filter((a) => a.stage === stage && a.state !== "NotApplicable");
    const dd = sa.reduce((s, a) => s + a.delayDays, 0);
    const delayed = sa.filter((a) => a.state === "Overdue").length;
    let worstCode: string | null = null, worstDelay = 0;
    for (const a of sa) if (a.delayDays > worstDelay) { worstDelay = a.delayDays; worstCode = a.code; }
    const risk: StageDelayRow["risk"] = delayed >= 3 || dd >= 60 ? "Critical" : delayed > 0 ? "At Risk" : "Clear";
    return { stage, short: STAGE_SHORT[stage] ?? stage, delayDays: dd, delayed, applicable: sa.length, worstCode, worstDelay, risk };
  }).sort((a, b) => b.delayDays - a.delayDays);

  const top = stageDelays.find((s) => s.delayDays > 0);
  const keyInsight = top ? `${top.short} caused ${top.delayDays} delay-days (#1 bottleneck) — ${top.delayed}/${top.applicable} activities overdue.` : null;

  // Current stage = first stage (plan order) with an open applicable activity.
  let currentStage: string | null = null;
  for (const stage of NPD_STAGES) {
    const sa = pa.filter((a) => a.stage === stage && a.state !== "NotApplicable" && a.state !== "Done");
    if (sa.length) { currentStage = STAGE_SHORT[stage] ?? stage; break; }
  }

  // Status mix (completion vs planned for done; overdue / pending otherwise).
  let onTimeEarly = 0, lateCompleted = 0;
  for (const a of app) {
    if (a.state !== "Done") continue;
    if (a.completionDate && a.plannedDate) {
      daysBetweenISO(a.plannedDate, a.completionDate) > 0 ? lateCompleted++ : onTimeEarly++;
    } else onTimeEarly++;
  }

  const status: ProductDetail["status"] = product.status === "Completed" || (total > 0 && done === total) ? "Completed"
    : overdue > 0 ? "Delayed" : done === 0 ? "Not Started" : "On Track";

  return {
    id: product.id, srNo: product.srNo ?? null, partName: product.partName, partNo: product.partNo, customer: product.customer,
    doerName: pa.find((a) => a.doerName)?.doerName ?? null,
    supervisorName: tasks.find((t) => t.productId === productId && t.supervisorName)?.supervisorName ?? null,
    startDate: product.startDate ?? null, targetEndDate: product.targetEndDate,
    predictedEnd: computePredictedEnd(pa.map((a) => ({ plannedDate: a.plannedDate, resolution: a.resolution, completionDate: a.completionDate, applicability: a.applicability })), product.targetEndDate),
    status, currentStage,
    kpis: { total, done, overdue, onTrack, onHold, pending, pctDone: total ? Math.round((done / total) * 100) : 0, delayDays },
    keyInsight, stageDelays, activities: pa,
    statusMix: { onTimeEarly, lateCompleted, overdue, pending: onTrack },
    onHold: pa.filter((a) => a.state === "OnHold"),
    remaining: total - done,
  };
}

/* ══════════════ D4 — single-department (stage) deep-dive ══════════════ */
export interface DepartmentDetail {
  stage: string; short: string;
  kpis: { total: number; onTime: number; early: number; lateCompleted: number; overdueNow: number; pending: number; done: number };
  efficiency: number;
  internalDelays: number; customerDelays: number;
  riskLevel: "Healthy" | "At Risk" | "Critical";
  primaryCause: "Internal" | "Customer" | "Balanced" | "—";
  byProduct: { productId: string; partName: string; tasks: number; done: number; overdue: number; pending: number; status: string }[];
  topCritical: EnrichedActivity[];
  onHold: EnrichedActivity[];
}

export function computeDepartmentDetail(
  stage: string,
  products: NpdProductLite[],
  tasks: NpdTaskLite[],
): DepartmentDetail {
  const acts = enrichActivities(products, tasks).filter((a) => a.stage === stage && a.state !== "NotApplicable");
  const done = acts.filter((a) => a.state === "Done");
  const overdueNow = acts.filter((a) => a.state === "Overdue").length;
  const onHold = acts.filter((a) => a.state === "OnHold");
  const pending = acts.filter((a) => a.state === "OnTrack" || a.state === "DueToday").length;
  let onTime = 0, early = 0, lateCompleted = 0;
  for (const a of done) {
    if (a.completionDate && a.plannedDate) {
      const v = daysBetweenISO(a.plannedDate, a.completionDate);
      if (v < 0) early++; else if (v === 0) onTime++; else lateCompleted++;
    } else onTime++;
  }
  const scored = onTime + early + lateCompleted;
  const efficiency = scored ? Math.round(((onTime + early) / scored) * 100) : 0;
  let internalDelays = 0, customerDelays = 0;
  for (const a of acts) if (a.state === "Overdue") (a.customer ? customerDelays++ : internalDelays++);
  const riskLevel: DepartmentDetail["riskLevel"] = overdueNow >= 3 ? "Critical" : overdueNow > 0 ? "At Risk" : "Healthy";
  const primaryCause = internalDelays === 0 && customerDelays === 0 ? "—"
    : internalDelays > customerDelays ? "Internal" : customerDelays > internalDelays ? "Customer" : "Balanced";

  const byMap = new Map<string, DepartmentDetail["byProduct"][number]>();
  const nameById = new Map(products.map((p) => [p.id, p.partName]));
  for (const a of acts) {
    const r = byMap.get(a.productId) ?? { productId: a.productId, partName: nameById.get(a.productId) ?? "—", tasks: 0, done: 0, overdue: 0, pending: 0, status: "On Track" };
    r.tasks++;
    if (a.state === "Done") r.done++; else if (a.state === "Overdue") r.overdue++; else r.pending++;
    byMap.set(a.productId, r);
  }
  const byProduct = [...byMap.values()].map((r) => ({ ...r, status: r.overdue > 0 ? "Delayed" : r.done === r.tasks ? "Complete" : "On Track" }));

  return {
    stage, short: STAGE_SHORT[stage] ?? stage,
    kpis: { total: acts.length, onTime, early, lateCompleted, overdueNow, pending, done: done.length },
    efficiency, internalDelays, customerDelays, riskLevel, primaryCause,
    byProduct,
    topCritical: acts.filter((a) => a.state === "Overdue").sort((a, b) => b.delayDays - a.delayDays),
    onHold,
  };
}

function toComputeInput(a: EnrichedActivity) {
  return { plannedDate: a.plannedDate, resolution: a.resolution, completionDate: a.completionDate, applicability: a.applicability };
}

function mkActivity(a: EnrichedActivity, daysLeft: number, overdue: boolean): UpcomingActivity {
  return {
    productId: a.productId, partName: a.partName, code: a.code, activityPlan: a.activityPlan,
    plannedDate: a.plannedDate ?? "", daysLeft, doerName: a.doerName, overdue,
  };
}

export type { NpdState };
