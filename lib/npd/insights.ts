/**
 * Dashboard aggregations over the derived NPD model.
 *
 * Pure and isomorphic — no DB, no React. The dashboard workspace filters the
 * product list to a scope (all / customer / selection / single product) and
 * hands the result to these; person-scope filters at the activity level. One
 * compute path, so the dashboard can never disagree with the Products page.
 *
 * The design brief is "maximum detail, shown simply": every function returns
 * small, already-shaped numbers a panel can render without further maths.
 */

import { NPD_STAGES, STAGE_SHORT, type NpdState } from "@/lib/npd/status";
import type { Activity, Health, Product, Stage } from "@/lib/npd/model";

export interface Kpis {
  activeParts: number;
  atRisk: number; // Critical + At Risk
  critical: number;
  overdueActivities: number;
  gateBlocked: number; // products with an overdue activity in their current stage
  unassigned: number;
  missingEvidence: number;
  onHold: number;
  avgProgress: number;
  slippingProducts: number; // products whose plan moved past baseline
}

export function computeKpis(products: Product[]): Kpis {
  const live = products.filter((p) => !p.archived);
  const n = live.length || 1;
  return {
    activeParts: live.length,
    atRisk: live.filter((p) => p.health === "Critical" || p.health === "At Risk").length,
    critical: live.filter((p) => p.health === "Critical").length,
    overdueActivities: live.reduce((s, p) => s + p.overdue, 0),
    gateBlocked: live.filter((p) => p.gateBlockers.some((a) => a.state === "Overdue")).length,
    unassigned: live.reduce((s, p) => s + p.unassigned, 0),
    missingEvidence: live.reduce((s, p) => s + p.missingEvidence, 0),
    onHold: live.reduce((s, p) => s + p.onHold, 0),
    avgProgress: Math.round(live.reduce((s, p) => s + p.pct, 0) / n),
    slippingProducts: live.filter((p) => p.slipDays > 0 || p.varianceDays > 0).length,
  };
}

export const HEALTHS: Health[] = ["Critical", "At Risk", "Good", "Done"];

export function healthMix(products: Product[]): { health: Health; count: number }[] {
  return HEALTHS.map((h) => ({ health: h, count: products.filter((p) => p.health === h).length }));
}

export interface StageBar {
  stage: Stage;
  short: string;
  wip: number; // products currently sitting in this stage
  done: number; // products that have passed this stage
  overdueActs: number; // overdue activities in this stage across products
}

/** Where products are in the pipeline + where the overdue work piles up. */
export function stageDistribution(products: Product[]): { bars: StageBar[]; bottleneck: Stage | null } {
  const bars: StageBar[] = NPD_STAGES.map((stage) => {
    const wip = products.filter((p) => p.currentStage === stage).length;
    const idx = NPD_STAGES.indexOf(stage);
    const done = products.filter((p) => {
      const ci = p.currentStage ? NPD_STAGES.indexOf(p.currentStage) : NPD_STAGES.length;
      return ci > idx; // current stage is later ⇒ this one is behind them
    }).length;
    const overdueActs = products.reduce(
      (s, p) => s + p.activities.filter((a) => a.stage === stage && a.state === "Overdue").length,
      0,
    );
    return { stage, short: STAGE_SHORT[stage] ?? stage, wip, done, overdueActs };
  });
  // Bottleneck = the stage clogged with the most WIP (ties → the more overdue one).
  let bottleneck: Stage | null = null;
  let best = 0;
  for (const b of bars) {
    const score = b.wip * 10 + b.overdueActs;
    if (b.wip > 0 && score > best) { best = score; bottleneck = b.stage; }
  }
  return { bars, bottleneck };
}

export interface ActivityRef {
  id: string;
  code: string;
  activityPlan: string;
  productId: string;
  productName: string;
  productSrNo: number | null;
  customer: string | null;
  doerName: string | null;
  plannedDate: string | null;
  daysLeft: number | null;
  state: NpdState;
  stage: Stage;
}

function toRef(a: Activity): ActivityRef {
  return {
    id: a.id, code: a.code, activityPlan: a.activityPlan, productId: a.productId,
    productName: a.productPartName, productSrNo: a.productSrNo, customer: a.productCustomer,
    doerName: a.doerName, plannedDate: a.plannedDate, daysLeft: a.daysLeft, state: a.state,
    stage: a.stage as Stage,
  };
}

/** Every overdue activity, worst first. */
export function overdueActivities(products: Product[]): ActivityRef[] {
  return products
    .flatMap((p) => p.activities)
    .filter((a) => a.state === "Overdue")
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
    .map(toRef);
}

/** Open activities due within `days` working days, soonest first. */
export function upcomingActivities(products: Product[], days = 14): ActivityRef[] {
  return products
    .flatMap((p) => p.activities)
    .filter((a) => a.isOpen && a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= days)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
    .map(toRef);
}

export interface DoerLoad {
  doerName: string;
  overdue: number;
  dueSoon: number; // next 7 working days
  later: number;
  total: number;
}

/** Open, applicable work per person — who is carrying (or blocking) the load. */
export function doerWorkload(products: Product[]): DoerLoad[] {
  const map = new Map<string, DoerLoad>();
  for (const a of products.flatMap((p) => p.activities)) {
    if (!a.isOpen) continue;
    const name = a.doerName ?? "Unassigned";
    const row = map.get(name) ?? { doerName: name, overdue: 0, dueSoon: 0, later: 0, total: 0 };
    if (a.state === "Overdue") row.overdue++;
    else if (a.daysLeft !== null && a.daysLeft <= 7) row.dueSoon++;
    else row.later++;
    row.total++;
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.overdue - a.overdue || b.total - a.total);
}

export interface CustomerRow {
  customer: string;
  products: number;
  atRisk: number;
  overdue: number;
  avgProgress: number;
}

export function customerBreakdown(products: Product[]): CustomerRow[] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const c = p.customer ?? "—";
    const arr = map.get(c) ?? [];
    arr.push(p);
    map.set(c, arr);
  }
  return [...map.entries()]
    .map(([customer, ps]) => ({
      customer,
      products: ps.length,
      atRisk: ps.filter((p) => p.health === "Critical" || p.health === "At Risk").length,
      overdue: ps.reduce((s, p) => s + p.overdue, 0),
      avgProgress: Math.round(ps.reduce((s, p) => s + p.pct, 0) / (ps.length || 1)),
    }))
    .sort((a, b) => b.atRisk - a.atRisk || b.products - a.products);
}

export interface ReasonRow {
  reason: string;
  count: number;
}

/** Pareto of delay reasons — the one dataset a spreadsheet never accumulates,
 *  because it's captured every time a date is shifted with a reason. */
export function delayReasons(products: Product[]): ReasonRow[] {
  const map = new Map<string, number>();
  for (const a of products.flatMap((p) => p.activities)) {
    const r = a.reasons?.trim();
    if (!r) continue;
    map.set(r, (map.get(r) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

/** Per-stage completion for a single product — the deep-dive spine. */
export function stageCycle(product: Product): { stage: Stage; short: string; pct: number; done: number; applicable: number; overdue: number; state: string }[] {
  return product.stages.map((s) => ({
    stage: s.stage,
    short: STAGE_SHORT[s.stage] ?? s.stage,
    pct: s.pct,
    done: s.done,
    applicable: s.applicable,
    overdue: s.overdue,
    state: s.state,
  }));
}
