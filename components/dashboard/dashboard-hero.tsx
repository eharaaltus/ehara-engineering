"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Plus,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import { Counter } from "./count-up";

interface Metric {
  label: string;
  value: number;
  icon: LucideIcon;
  from: string;
  to: string;
}

export function DashboardHero({
  firstName,
  total,
  pending,
  done,
  notStarted,
  dueToday,
  overdue,
}: {
  firstName: string;
  total: number;
  pending: number;
  done: number;
  notStarted: number;
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

  const completion = total > 0 ? Math.round((done / total) * 100) : 0;

  const metrics: Metric[] = [
    { label: "Total tasks", value: total, icon: ListTodo, from: "#1e40af", to: "#14245c" },
    { label: "In progress", value: pending, icon: CircleDashed, from: "#f59e0b", to: "#d97706" },
    { label: "Not started", value: notStarted, icon: CalendarClock, from: "#64748b", to: "#475569" },
    { label: "Completed", value: done, icon: CheckCircle2, from: "#e11d2f", to: "#3f7a14" },
  ];

  return (
    <section className="mx-auto max-w-[1600px] px-12 max-md:px-4 mt-6">
      <div
        className="relative overflow-hidden rounded-[26px] border border-white/80 px-8 py-6 max-md:px-5 max-md:py-6"
        style={{
          background: "linear-gradient(120deg, #e9f3fd 0%, #ffffff 46%, #edf7e3 100%)",
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

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={"/tasks/agenda" as Route}
              className="group inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"
            >
              Open My Day
              <ArrowRight size={15} strokeWidth={2.6} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={"/tasks/new" as Route}
              className="group inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[13.5px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #e11d2f, #1e40af)", boxShadow: "0 14px 30px -14px rgba(30, 64, 175,0.6)" }}
            >
              <Plus size={16} strokeWidth={2.8} /> New task
            </Link>
          </div>
        </div>

        {/* metric strip */}
        <div className="relative mt-5 grid grid-cols-4 gap-3 max-lg:grid-cols-2">
          {metrics.map((m) => (
            <HeroMetric key={m.label} metric={m} />
          ))}
        </div>

        {/* completion bar */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[12px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              {overdue > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600 ring-1 ring-red-200">
                  <AlertTriangle size={11} /> {overdue} overdue
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                <CalendarClock size={11} /> {dueToday} due today
              </span>
            </span>
            <span className="tabular-nums text-slate-600">{completion}% complete</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-out"
              style={{ width: `${completion}%`, background: "linear-gradient(90deg, #e11d2f, #1e40af)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${metric.from}, ${metric.to})` }} />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[200%] -skew-x-12 bg-gradient-to-r from-transparent via-slate-100/80 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[260%]" />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{metric.label}</span>
        {/* small pastel chip — soft tint + colour icon + inner ring */}
        <span
          className="inline-flex size-6 items-center justify-center rounded-[9px] transition-transform group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${metric.from}26, ${metric.to}1a)`,
            color: metric.from,
            boxShadow: `inset 0 0 0 1.5px ${metric.from}3d`,
          }}
        >
          <Icon size={14} strokeWidth={2.7} />
        </span>
      </div>
      <Counter
        value={metric.value}
        className="relative mt-1.5 block tabular-nums text-slate-900"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(24px, 2.4vw, 32px)", letterSpacing: "-0.025em", lineHeight: 1 }}
      />
    </div>
  );
}
