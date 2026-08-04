"use client";

import * as React from "react";

/**
 * The greeting band above the dashboard.
 *
 * Deliberately just a greeting now. It used to carry a four-card metric strip
 * (Total / In Progress / Not Started / Completed), a completion bar and a pair
 * of "Open My Day" / "New task" buttons — all of which restated something
 * already on screen: the numbers are the KPI row directly below, and both
 * buttons are in the header. Removing them lifts the real dashboard about a
 * screen higher.
 *
 * `total`, `pending`, `done` and `notStarted` are gone from the props with the
 * strip; `dueToday` and `overdue` stay, because the greeting line is the only
 * place either is stated.
 */
export function DashboardHero({
  firstName,
  dueToday,
  overdue,
}: {
  firstName: string;
  dueToday: number;
  overdue: number;
}) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
  }, []);

  const hour = now?.getHours() ?? 9;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = now
    ? now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <section className="mx-auto max-w-[1600px] px-12 max-md:px-4 mt-6">
      <div
        className="relative overflow-hidden rounded-[26px] border border-white/80 px-8 py-6 max-md:px-5 max-md:py-6"
        style={{
          background: "linear-gradient(120deg, #e9f3fd 0%, #ffffff 46%, #fdecef 100%)",
          boxShadow: "0 30px 70px -38px rgba(15,60,100,0.30), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        {/* ambient layers */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.6]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.06) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
          <div className="hero-anim absolute -left-28 -top-32 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, rgba(30, 64, 175,0.16), transparent 66%)", filter: "blur(30px)", animation: "heroFloat1 16s ease-in-out infinite" }} />
          <div className="hero-anim absolute right-[-7rem] top-[18%] h-[440px] w-[440px] rounded-full" style={{ background: "radial-gradient(circle, rgba(225, 29, 47,0.15), transparent 66%)", filter: "blur(34px)", animation: "heroFloat2 20s ease-in-out infinite" }} />
          <img src="/logo-mark.png" alt="" className="absolute -right-6 -top-10 h-[240px] w-auto opacity-[0.05] max-md:hidden" />
        </div>

        {/* top row: greeting + actions */}
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <span className="inline-block size-1.5 rounded-full bg-[#e11d2f] shadow-[0_0_8px_#e11d2f88]" />
              {dateLabel || "Your workspace"}
            </div>
            <h1
              className="mt-2 text-slate-900"
              style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.02, letterSpacing: "-0.035em" }}
            >
              {greeting}, {firstName}.
            </h1>
            <p className="mt-2 text-[14px] text-slate-500 max-w-xl">
              {overdue > 0 ? (
                <>You have <b className="text-slate-800">{overdue}</b> overdue and <b className="text-slate-800">{dueToday}</b> due today. Let&apos;s clear them.</>
              ) : dueToday > 0 ? (
                <>You have <b className="text-slate-800">{dueToday}</b> task{dueToday === 1 ? "" : "s"} due today. You&apos;re on top of it.</>
              ) : (
                <>Nothing overdue — a clean board. Here&apos;s the operation at a glance.</>
              )}
            </p>
          </div>

          {/* "Open My Day" and "New task" used to sit here. Both were already one
              click away in the header — My Day is a primary nav pill and New Task
              is the header's own button — so this pair was the same two actions
              a second time, costing a full row of hero width. Removed rather than
              restyled: a duplicate control isn't a shortcut, it's noise. */}
        </div>

        {/* The Total / In Progress / Not Started / Completed strip and the
            completion bar used to sit here. Every one of those numbers is in
            the KPI row immediately below — Total, Pending, Not Started, Done —
            so the hero was restating the next section in bigger type, pushing
            the real dashboard a full screen down. The greeting line still
            carries the only thing the KPI row doesn't say: how many are overdue
            and due today. */}
      </div>
    </section>
  );
}

