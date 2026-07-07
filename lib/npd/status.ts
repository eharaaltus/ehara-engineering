// NPD status + health computation (pure; safe on server & client).
export const NPD_STAGES = [
  "TECHNICAL",
  "COMMERCIAL",
  "TOOL DEVELOPMENT",
  "PART SUBMISSION",
  "PPAP & PTR DOCUMENT",
  "PRE PRODUCTION HANDOVER",
] as const;

export const STAGE_SHORT: Record<string, string> = {
  TECHNICAL: "Technical",
  COMMERCIAL: "Commercial",
  "TOOL DEVELOPMENT": "Tooling",
  "PART SUBMISSION": "Part Sub.",
  "PPAP & PTR DOCUMENT": "PPAP/PTR",
  "PRE PRODUCTION HANDOVER": "Pre-Prod.",
};

export type NpdState = "Done" | "OnHold" | "NotApplicable" | "Overdue" | "DueToday" | "OnTrack";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

export interface NpdComputed {
  state: NpdState;
  label: string;
  daysLeft: number | null;
}

export function computeNpd(t: {
  plannedDate: string | null;
  resolution: string;
  completionDate: string | null;
  applicability: string;
}): NpdComputed {
  if (t.applicability === "N/A") return { state: "NotApplicable", label: "N/A", daysLeft: null };
  if (t.resolution === "Done" || t.completionDate) return { state: "Done", label: "✓ Done", daysLeft: null };
  if (t.resolution === "On Hold" || t.applicability === "On Hold")
    return { state: "OnHold", label: "On Hold", daysLeft: null };
  if (!t.plannedDate) return { state: "OnTrack", label: "On Track", daysLeft: null };
  const d = daysBetween(todayISO(), t.plannedDate);
  if (d < 0) return { state: "Overdue", label: `Overdue ${Math.abs(d)}d`, daysLeft: d };
  if (d === 0) return { state: "DueToday", label: "Due today", daysLeft: 0 };
  return { state: "OnTrack", label: `${d}d left`, daysLeft: d };
}

export interface NpdHealth {
  applicable: number;
  completed: number;
  overdue: number;
  onTrack: number;
  onHold: number;
  percentDone: number;
  /** How many days behind schedule the product is = the WORST single overdue
   *  task (the bottleneck), NOT the sum across tasks. For one product's timeline
   *  the slip can't exceed the most-overdue activity, so summing (e.g. 19 tasks ×
   *  ~40d = 765d) is meaningless — the real delay is ~44d. Matches the shift
   *  used by computePredictedEnd. */
  maxDelayDays: number;
  health: "Good" | "At Risk" | "Critical";
}

export function computeHealth(tasks: Parameters<typeof computeNpd>[0][]): NpdHealth {
  let applicable = 0, completed = 0, overdue = 0, onTrack = 0, onHold = 0, maxDelayDays = 0;
  for (const t of tasks) {
    const c = computeNpd(t);
    if (c.state === "NotApplicable") continue;
    applicable++;
    if (c.state === "Done") completed++;
    else if (c.state === "Overdue") { overdue++; maxDelayDays = Math.max(maxDelayDays, Math.abs(c.daysLeft ?? 0)); }
    else if (c.state === "OnHold") onHold++;
    else onTrack++;
  }
  const percentDone = applicable ? Math.round((completed / applicable) * 100) : 0;
  const health = overdue >= 5 || maxDelayDays >= 30 ? "Critical" : overdue > 0 ? "At Risk" : "Good";
  return { applicable, completed, overdue, onTrack, onHold, percentDone, maxDelayDays, health };
}

/**
 * Predicted project end date.
 *
 * The old logic added the SUM of every overdue task's lateness to the target —
 * so a 1-day slip on 10 tasks pushed the end out 10 days, which is wrong. A
 * project finishes when its LAST work finishes, so the shift is driven by the
 * single worst *current* slip, not the total:
 *   • all applicable tasks done → the actual last completion date (can land
 *     BEFORE the target if finished early — the date "comes back").
 *   • otherwise → target end + the largest slip among still-open tasks
 *     (max(0, today − plannedDate)). Each task 1 day late ⇒ ~1 day shift; catch
 *     up and the slip shrinks, so the predicted date moves back toward target.
 */
export function computePredictedEnd(
  tasks: Parameters<typeof computeNpd>[0][],
  targetEndDate: string | null,
): string | null {
  const today = todayISO();
  let allDone = true;
  let maxSlip = 0;
  let lastCompletion: string | null = null;
  let lastPlanned: string | null = null;
  for (const t of tasks) {
    const c = computeNpd(t);
    if (c.state === "NotApplicable" || c.state === "OnHold") continue;
    if (c.state === "Done") {
      if (t.completionDate && (!lastCompletion || t.completionDate > lastCompletion)) {
        lastCompletion = t.completionDate;
      }
      continue;
    }
    allDone = false;
    if (t.plannedDate) {
      if (!lastPlanned || t.plannedDate > lastPlanned) lastPlanned = t.plannedDate;
      const slip = daysBetween(t.plannedDate, today); // today − planned (>0 = late)
      if (slip > maxSlip) maxSlip = slip;
    }
  }
  if (allDone) return lastCompletion ?? targetEndDate;
  const base = targetEndDate ?? lastPlanned;
  if (!base) return null;
  return maxSlip > 0 ? addDaysISO(base, maxSlip) : base;
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()}-${m[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}
