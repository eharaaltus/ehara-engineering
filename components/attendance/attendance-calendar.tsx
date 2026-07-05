"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayPunches } from "@/lib/queries/attendance";
import { formatTimeInTz } from "@/lib/format";

type Status = "present" | "incomplete" | "absent" | "off" | "today" | "future";

const STATUS_STYLE: Record<Status, { bg: string; fg: string; label: string }> = {
  present: { bg: "color-mix(in srgb, #16a34a 14%, transparent)", fg: "#15803d", label: "Present" },
  incomplete: { bg: "color-mix(in srgb, #d97706 16%, transparent)", fg: "#b45309", label: "No check-out" },
  absent: { bg: "color-mix(in srgb, #e11d2f 12%, transparent)", fg: "#b3121f", label: "Absent" },
  off: { bg: "color-mix(in srgb, #64748b 12%, transparent)", fg: "#475569", label: "Week off" },
  today: { bg: "var(--color-surface-soft)", fg: "var(--color-ink-soft)", label: "Today" },
  future: { bg: "transparent", fg: "var(--color-ink-subtle)", label: "" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthLabel(monthISO: string): string {
  const [y, m] = monthISO.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, 1, 12)),
  );
}

/** Shift a "YYYY-MM" by ±1 month. */
function shiftMonth(monthISO: string, delta: number): string {
  const [y, m] = monthISO.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + delta, 1, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function AttendanceCalendar({
  monthISO,
  days,
  tz,
  today,
  weeklyOffs,
  emp,
  heading,
}: {
  monthISO: string;
  days: DayPunches[];
  tz: string;
  today: string; // YYYY-MM-DD (employee tz)
  weeklyOffs: number[]; // JS getDay() indices that are non-working (0=Sun)
  emp?: string; // admin: preserve selected employee across month nav
  heading: string;
}) {
  const [y, m] = monthISO.split("-").map(Number);
  const year = y ?? 2026;
  const month = (m ?? 1) - 1; // 0-based
  const byDate = new Map(days.map((d) => [d.date, d]));

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Monday-first offset for the 1st of the month.
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Sun
  const lead = (firstDow + 6) % 7; // convert so Monday=0

  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function statusFor(dateStr: string, dow: number): Status {
    if (dateStr > today) return "future";
    const punch = byDate.get(dateStr);
    if (punch?.in && punch?.out) return "present";
    if (punch?.in) return dateStr === today ? "incomplete" : "incomplete";
    if (weeklyOffs.includes(dow)) return "off";
    if (dateStr === today) return "today";
    return "absent";
  }

  const q = (mo: string) =>
    (`/attendance?month=${mo}${emp ? `&emp=${emp}` : ""}` as Route);

  // Month summary counts.
  let present = 0, absent = 0, off = 0, incomplete = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${monthISO}-${String(d).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(year, month, d)).getUTCDay();
    const s = statusFor(ds, dow);
    if (s === "present") present++;
    else if (s === "absent") absent++;
    else if (s === "off") off++;
    else if (s === "incomplete") incomplete++;
  }

  return (
    <section
      className="mt-6 rounded-section bg-surface-card p-6 max-md:p-4"
      style={{ border: "1px solid var(--color-hairline)", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}
    >
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-display-2xs text-ink-strong">{heading}</h2>
          <p className="mt-1 text-[13px] text-ink-subtle">
            <b className="text-[#15803d]">{present}</b> present · <b className="text-[#b3121f]">{absent}</b> absent
            {incomplete > 0 && <> · <b className="text-[#b45309]">{incomplete}</b> open</>} · {off} off
          </p>
        </div>
        <div className="inline-flex items-center gap-1">
          <Link href={q(shiftMonth(monthISO, -1))} className="inline-flex size-9 items-center justify-center rounded-lg border border-hairline hover:bg-surface-soft" aria-label="Previous month">
            <ChevronLeft size={16} />
          </Link>
          <span className="min-w-[140px] text-center text-[14px] font-bold text-ink-strong">{monthLabel(monthISO)}</span>
          <Link href={q(shiftMonth(monthISO, 1))} className="inline-flex size-9 items-center justify-center rounded-lg border border-hairline hover:bg-surface-soft" aria-label="Next month">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const ds = `${monthISO}-${String(day).padStart(2, "0")}`;
          const dow = new Date(Date.UTC(year, month, day)).getUTCDay();
          const s = statusFor(ds, dow);
          const st = STATUS_STYLE[s];
          const punch = byDate.get(ds);
          const isToday = ds === today;
          return (
            <div
              key={ds}
              title={`${ds} — ${st.label}`}
              className="relative flex min-h-[62px] flex-col rounded-lg px-2 py-1.5 max-md:min-h-[52px]"
              style={{
                background: st.bg,
                border: isToday ? "1.5px solid var(--color-brand-blue)" : "1px solid var(--color-hairline)",
              }}
            >
              <span className="text-[12px] font-bold" style={{ color: st.fg }}>{day}</span>
              {punch?.in && (
                <span className="mt-auto text-[10.5px] leading-tight tabular-nums text-ink-soft">
                  {formatTimeInTz(punch.in.at, tz)}
                  {punch.out && <>–{formatTimeInTz(punch.out.at, tz)}</>}
                </span>
              )}
              {!punch?.in && s !== "future" && (
                <span className="mt-auto text-[10px] font-semibold" style={{ color: st.fg }}>{st.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
