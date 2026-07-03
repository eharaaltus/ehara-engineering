import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CalendarDays, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import type { MyDayCounts } from "@/lib/queries/my-day";

interface Props {
  firstName: string;
  counts: MyDayCounts;
}

/**
 * Compact per-user "Your day" card on the dashboard top. Mirrors the
 * full agenda banner at /tasks/agenda but condensed to a single row of
 * three stats — due today / overdue / done today — with a CTA to the
 * full agenda. Hidden via the dashboard's empty-state branch.
 *
 * Renders as a quiet card; not the dashboard's centerpiece.
 */
export function MyDayCard({ firstName, counts }: Props) {
  const { dueToday, overdue, doneToday } = counts;

  // Quiet behaviour: if the user has literally nothing happening today
  // and no overdue items, we hide the card so we don't show a wall of
  // zeros. Done-today still shows as encouragement when > 0.
  if (dueToday === 0 && overdue === 0 && doneToday === 0) return null;

  return (
    <section className="mx-auto max-w-[1600px] px-12 max-md:px-4 mt-6">
      <div className="group relative">
        {/* soft glow halo on hover */}
        <div
          aria-hidden
          className="absolute -inset-0.5 rounded-[20px] opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-40"
          style={{ background: "linear-gradient(120deg, #0180cf, #63b81e)" }}
        />
        <Link
          href={"/tasks/agenda" as Route}
          className="relative block overflow-hidden rounded-[18px] border border-white/70 px-6 py-4 backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(120deg, rgba(1,128,207,0.07), rgba(255,255,255,0.85) 45%, rgba(99,184,30,0.07))",
            boxShadow: "0 10px 30px -18px rgba(15,40,80,0.35), 0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          {/* shine sweep */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[220%] -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%]"
          />
          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex size-11 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #0180cf, #63b81e)", boxShadow: "0 10px 22px -10px #0180cfcc" }}
                >
                  <Sparkles size={20} strokeWidth={2.3} />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.12em] font-black text-ink-subtle">Your day</div>
                  <div className="text-[17px] font-black tracking-[-0.01em] text-ink-strong mt-0.5">{firstName}</div>
                </div>
              </div>
              <Stat icon={<CalendarDays size={14} strokeWidth={2.4} />} tone="blue" value={dueToday} label="due today" />
              {overdue > 0 && <Stat icon={<AlertTriangle size={14} strokeWidth={2.4} />} tone="red" value={overdue} label="overdue" />}
              <Stat icon={<CheckCircle2 size={14} strokeWidth={2.4} />} tone="green" value={doneToday} label="done today" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3.5 py-2 text-[13px] font-bold text-ink-soft shadow-sm transition-colors group-hover:text-ink-strong">
              Open My Day
              <ArrowRight size={14} strokeWidth={2.6} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

function Stat({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: "blue" | "red" | "green";
  value: number;
  label: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{
        background: `var(--color-${tone}-bg)`,
        color: `var(--color-${tone}-deep)`,
      }}
    >
      {icon}
      <span className="font-bold tabular-nums text-[15px]">{value}</span>
      <span className="text-[12.5px] opacity-80">{label}</span>
    </div>
  );
}
