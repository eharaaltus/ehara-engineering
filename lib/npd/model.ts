/**
 * The one derived model every NPD view reads from.
 *
 * Table, board, gate matrix, timeline and tracker are five ways of LOOKING at
 * the same computed truth — so the truth is computed exactly once, here, and the
 * views stay dumb. That is the difference between this and the spreadsheet,
 * where every tab re-derives status with its own subtly different formula and
 * two tabs quietly disagree.
 *
 * Pure + isomorphic: no DB, no React. Server computes it, client re-computes it
 * identically for instant filtering.
 */

import { NPD_STAGES, computeNpd, type NpdState } from "@/lib/npd/status";
import {
  DEFAULT_CALENDAR,
  addWorkdays,
  todayISO,
  workdaysBetween,
  type WorkdayCalendar,
} from "@/lib/npd/workdays";

export type Stage = (typeof NPD_STAGES)[number];
export type Health = "Good" | "At Risk" | "Critical" | "Done";

export interface ActivityInput {
  id: string;
  productId: string;
  stage: string;
  code: string;
  activityPlan: string;
  plannedDate: string | null;
  baselineDate: string | null;
  resolution: string;
  completionDate: string | null;
  applicability: string;
  drawingLink: string | null;
  reasons: string | null;
  doerId: string | null;
  doerName: string | null;
  supervisorName: string | null;
  sortOrder: number;
}

export interface ProductInput {
  id: string;
  srNo: number | null;
  partName: string;
  partNo: string | null;
  customer: string | null;
  status: string;
  archived: boolean;
  startDate: string | null;
  targetEndDate: string | null;
  baselineEndDate: string | null;
  defaultDoerName: string | null;
  defaultSupervisorName: string | null;
}

/** One activity, with everything the UI needs already decided. */
export interface Activity extends ActivityInput {
  state: NpdState;
  label: string;
  /** WORKING days until planned date. Negative = overdue. */
  daysLeft: number | null;
  /** planned − baseline, in working days. >0 means the PLAN itself moved — the
   *  silent failure mode where nothing is ever "overdue" because everyone keeps
   *  pushing the date to the right. */
  slipDays: number;
  isApplicable: boolean;
  isOpen: boolean;
  /** Open, and sitting in the product's current stage — i.e. one of the few
   *  activities actually holding the gate shut. Everything else can wait. */
  blocksGate: boolean;
  /** Marked Done but the evidence link the activity is supposed to carry is
   *  missing. This is the failure that gets caught at the customer audit. */
  missingEvidence: boolean;
  productPartName: string;
  productSrNo: number | null;
  productCustomer: string | null;
}

export interface StageProgress {
  stage: Stage;
  done: number;
  applicable: number;
  overdue: number;
  /** 0–100 over APPLICABLE activities only. Dividing by 36 is a lie the moment
   *  one activity is N/A. */
  pct: number;
  /** A gate is OPEN only when every applicable activity in it is resolved. */
  gateOpen: boolean;
  state: "complete" | "current" | "future";
}

export interface Product extends ProductInput {
  activities: Activity[];
  stages: StageProgress[];
  /** The earliest stage that isn't fully done — where the product actually is,
   *  regardless of what anyone typed in a status column. */
  currentStage: Stage | null;
  applicable: number;
  done: number;
  overdue: number;
  onHold: number;
  open: number;
  pct: number;
  health: Health;
  /** Plain-English reason the health is what it is. Shown on hover. A colour
   *  nobody can explain is a colour nobody trusts. */
  healthReason: string;
  /** Worst current slip across open activities, in working days. */
  slipDays: number;
  /** Target + current slip — when this will REALLY land. */
  forecastEnd: string | null;
  /** forecastEnd vs the frozen baseline: days late to the original promise. */
  varianceDays: number;
  nextUp: Activity | null;
  gateBlockers: Activity[];
  unassigned: number;
  missingEvidence: number;
}

/** Activities whose completion is meaningless without an attached drawing/doc.
 *  Marking these Done with an empty link is how "we had it, honest" happens. */
const EVIDENCE_CODES = new Set(["T2", "T3", "C1", "TD3", "PS2", "PS4", "PP1", "PP2", "PP3"]);

function isStage(s: string): s is Stage {
  return (NPD_STAGES as readonly string[]).includes(s);
}

export function buildActivity(
  a: ActivityInput,
  product: ProductInput,
  currentStage: Stage | null,
  cal: WorkdayCalendar,
): Activity {
  const c = computeNpd({
    plannedDate: a.plannedDate,
    resolution: a.resolution,
    completionDate: a.completionDate,
    applicability: a.applicability,
  });
  const isApplicable = a.applicability !== "N/A";
  const isOpen = isApplicable && c.state !== "Done" && c.state !== "OnHold";

  // Recompute daysLeft in WORKING days — computeNpd's calendar-day version is
  // kept for the legacy dashboard, but everything new uses this.
  const daysLeft =
    isOpen && a.plannedDate ? workdaysBetween(todayISO(), a.plannedDate, cal) : null;

  const slipDays =
    a.plannedDate && a.baselineDate ? workdaysBetween(a.baselineDate, a.plannedDate, cal) : 0;

  return {
    ...a,
    state: c.state,
    label: c.label,
    daysLeft,
    slipDays: Math.max(0, slipDays),
    isApplicable,
    isOpen,
    blocksGate: isOpen && currentStage !== null && a.stage === currentStage,
    missingEvidence:
      c.state === "Done" && EVIDENCE_CODES.has(a.code) && !a.drawingLink?.trim(),
    productPartName: product.partName,
    productSrNo: product.srNo,
    productCustomer: product.customer,
  };
}

export function buildProduct(
  p: ProductInput,
  rawActivities: ActivityInput[],
  cal: WorkdayCalendar = DEFAULT_CALENDAR,
): Product {
  const sorted = [...rawActivities].sort((a, b) => a.sortOrder - b.sortOrder);

  // Pass 1 — resolve each stage's completion so we can find the current stage.
  // (`blocksGate` needs the current stage, and the current stage needs the stage
  // completions, so this genuinely has to be two passes.)
  const stageRaw = NPD_STAGES.map((stage) => {
    const inStage = sorted.filter((a) => a.stage === stage);
    let done = 0;
    let applicable = 0;
    for (const a of inStage) {
      if (a.applicability === "N/A") continue;
      applicable++;
      if (a.resolution === "Done" || a.completionDate) done++;
    }
    return { stage, done, applicable };
  });

  // The product IS in the first stage that isn't finished. A stage with zero
  // applicable activities is vacuously complete and must not trap the product.
  const currentIdx = stageRaw.findIndex((s) => s.applicable > 0 && s.done < s.applicable);
  const currentStage: Stage | null = currentIdx === -1 ? null : stageRaw[currentIdx]!.stage;

  const activities = sorted
    .filter((a) => isStage(a.stage))
    .map((a) => buildActivity(a, p, currentStage, cal));

  const stages: StageProgress[] = stageRaw.map((s, i) => {
    const overdue = activities.filter((a) => a.stage === s.stage && a.state === "Overdue").length;
    const gateOpen = s.applicable > 0 && s.done === s.applicable;
    const state: StageProgress["state"] =
      currentIdx === -1 || i < currentIdx ? "complete" : i === currentIdx ? "current" : "future";
    return {
      stage: s.stage,
      done: s.done,
      applicable: s.applicable,
      overdue,
      pct: s.applicable ? Math.round((s.done / s.applicable) * 100) : 0,
      gateOpen,
      state,
    };
  });

  const applicable = activities.filter((a) => a.isApplicable).length;
  const done = activities.filter((a) => a.state === "Done").length;
  const overdue = activities.filter((a) => a.state === "Overdue").length;
  const onHold = activities.filter((a) => a.state === "OnHold").length;
  const open = activities.filter((a) => a.isOpen).length;
  const pct = applicable ? Math.round((done / applicable) * 100) : 0;

  // Slip = the WORST single open activity, never the sum. A project finishes
  // when its last work finishes, so 10 activities each 1 day late is a 1-day
  // slip, not a 10-day one. (Summing is the classic tracker bug that produces
  // "765 days behind" on a 5-month project.)
  const slipDays = activities.reduce(
    (worst, a) => (a.isOpen && a.daysLeft !== null && a.daysLeft < 0
      ? Math.max(worst, Math.abs(a.daysLeft))
      : worst),
    0,
  );

  const gateBlockers = activities.filter((a) => a.blocksGate);
  const nextUp =
    activities
      .filter((a) => a.isOpen && a.plannedDate)
      .sort((a, b) => (a.plannedDate! < b.plannedDate! ? -1 : 1))[0] ?? null;

  const forecastEnd =
    applicable > 0 && done === applicable
      ? activities.reduce<string | null>(
          (last, a) => (a.completionDate && (!last || a.completionDate > last) ? a.completionDate : last),
          null,
        ) ?? p.targetEndDate
      : p.targetEndDate
        ? addWorkdays(p.targetEndDate, slipDays, cal)
        : null;

  const varianceDays =
    forecastEnd && p.baselineEndDate ? workdaysBetween(p.baselineEndDate, forecastEnd, cal) : 0;

  const { health, healthReason } = computeHealthWithReason({
    applicable,
    done,
    overdue,
    slipDays,
    gateBlockersOverdue: gateBlockers.filter((a) => a.state === "Overdue").length,
    varianceDays,
    status: p.status,
  });

  return {
    ...p,
    activities,
    stages,
    currentStage,
    applicable,
    done,
    overdue,
    onHold,
    open,
    pct,
    health,
    healthReason,
    slipDays,
    forecastEnd,
    varianceDays,
    nextUp,
    gateBlockers,
    unassigned: activities.filter((a) => a.isOpen && !a.doerId).length,
    missingEvidence: activities.filter((a) => a.missingEvidence).length,
  };
}

/**
 * RAG health, and — just as importantly — WHY.
 *
 * Every rule that fires is named in plain English and surfaced on hover. An
 * unexplained red dot is the fastest way to lose a team's trust in a tracker:
 * the first time someone can't see why their product is red, they go back to the
 * spreadsheet. So the rule is explicit, ordered, and quotable.
 */
function computeHealthWithReason(x: {
  applicable: number;
  done: number;
  overdue: number;
  slipDays: number;
  gateBlockersOverdue: number;
  varianceDays: number;
  status: string;
}): { health: Health; healthReason: string } {
  if (x.applicable > 0 && x.done === x.applicable) {
    return { health: "Done", healthReason: "All applicable activities are complete." };
  }
  if (x.status === "On Hold") {
    return { health: "At Risk", healthReason: "Product is On Hold." };
  }

  const reasons: string[] = [];
  if (x.gateBlockersOverdue > 0) {
    reasons.push(`${x.gateBlockersOverdue} overdue activity${x.gateBlockersOverdue === 1 ? "" : "s"} blocking the current gate`);
  }
  if (x.slipDays > 7) reasons.push(`${x.slipDays} working days behind schedule`);
  if (x.varianceDays > 7) reasons.push(`forecast is ${x.varianceDays} days past the committed baseline`);

  if (reasons.length) return { health: "Critical", healthReason: `Critical — ${reasons.join("; ")}.` };

  if (x.overdue > 0) {
    return {
      health: "At Risk",
      healthReason: `At risk — ${x.overdue} overdue activity${x.overdue === 1 ? "" : "s"}${
        x.slipDays ? `, worst is ${x.slipDays} working day${x.slipDays === 1 ? "" : "s"} late` : ""
      }.`,
    };
  }
  if (x.varianceDays > 0) {
    return {
      health: "At Risk",
      healthReason: `At risk — nothing overdue yet, but the forecast is ${x.varianceDays} working day${
        x.varianceDays === 1 ? "" : "s"
      } past the committed baseline.`,
    };
  }
  return { health: "Good", healthReason: "On track — nothing overdue." };
}

// ── Filtering / grouping helpers shared by the views ────────────────────────

export const HEALTH_ORDER: Record<Health, number> = { Critical: 0, "At Risk": 1, Good: 2, Done: 3 };

/**
 * Status colours come from the app's design tokens (`app/globals.css`), NOT from
 * hex invented here — so NPD looks like the rest of the WMS instead of a bolted-on
 * module, and a future theme change moves it too.
 *
 * Two rules, both deliberate:
 *  • Red means "act now". "Open / on track" is the DEFAULT state of 30-odd
 *    activities on every product, so it is deliberately quiet slate — if the
 *    normal case is loud, nothing is.
 *  • Every colour is paired with a glyph. Roughly 1 in 12 men is red-green
 *    colour deficient, and this is a red-green-heavy app on a shop floor.
 */
export const BRAND = {
  blue: "var(--color-brand-blue)",
  blueDeep: "var(--color-brand-blue-deep)",
  red: "#e11d2f", // Ehara accent red — pairs with blue in every brand gradient
  /** The house gradient, used on primary actions and icon chips. */
  gradient: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)",
} as const;

export const STATE_META: Record<
  NpdState,
  { label: string; color: string; bg: string; glyph: string }
> = {
  Overdue: { label: "Overdue", color: "var(--color-red-deep)", bg: "var(--color-red-bg)", glyph: "" },
  DueToday: { label: "Due today", color: "var(--color-amber-deep)", bg: "var(--color-amber-bg)", glyph: "" },
  OnTrack: { label: "On track", color: "var(--color-ink-subtle)", bg: "var(--color-surface-track)", glyph: "" },
  Done: { label: "Done", color: "var(--color-green-deep)", bg: "var(--color-green-bg)", glyph: "✓" },
  OnHold: { label: "On hold", color: "var(--color-purple-deep)", bg: "var(--color-purple-bg)", glyph: "" },
  NotApplicable: { label: "N/A", color: "var(--color-stone-deep)", bg: "var(--color-stone-bg)", glyph: "" },
};

// A small filled dot reads as calm and clean; the colour carries the meaning and
// the position (products sort worst-first) reinforces it. No exclamation marks.
export const HEALTH_META: Record<Health, { color: string; bg: string; glyph: string; label: string }> = {
  Critical: { color: "var(--color-red-deep)", bg: "var(--color-red-bg)", glyph: "●", label: "Needs attention" },
  "At Risk": { color: "var(--color-amber-deep)", bg: "var(--color-amber-bg)", glyph: "●", label: "At risk" },
  Good: { color: "var(--color-green-deep)", bg: "var(--color-green-bg)", glyph: "●", label: "On track" },
  Done: { color: "var(--color-blue-deep)", bg: "var(--color-blue-bg)", glyph: "✓", label: "Complete" },
};
