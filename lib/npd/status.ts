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
  totalDelayDays: number;
  health: "Good" | "At Risk" | "Critical";
}

export function computeHealth(tasks: Parameters<typeof computeNpd>[0][]): NpdHealth {
  let applicable = 0, completed = 0, overdue = 0, onTrack = 0, onHold = 0, totalDelayDays = 0;
  for (const t of tasks) {
    const c = computeNpd(t);
    if (c.state === "NotApplicable") continue;
    applicable++;
    if (c.state === "Done") completed++;
    else if (c.state === "Overdue") { overdue++; totalDelayDays += Math.abs(c.daysLeft ?? 0); }
    else if (c.state === "OnHold") onHold++;
    else onTrack++;
  }
  const percentDone = applicable ? Math.round((completed / applicable) * 100) : 0;
  const health = overdue >= 5 || totalDelayDays >= 60 ? "Critical" : overdue > 0 ? "At Risk" : "Good";
  return { applicable, completed, overdue, onTrack, onHold, percentDone, totalDelayDays, health };
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
