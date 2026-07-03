"use client";

import Link from "next/link";
import type { Route } from "next";
import { Crown, Inbox, TrendingUp, TrendingDown, Minus, Activity, Users, Flame, Gauge } from "lucide-react";
import type { TopPerformer } from "@/lib/types";
import { useCountUp } from "@/lib/use-count-up";
import { EmployeeAvatar } from "@/components/ui/employee-avatar";

/* ── helpers ─────────────────────────────────────────────────────────── */

interface Trend {
  dir: "up" | "down" | "flat";
  pct: number;
}

function trendOf(spark: number[] | undefined): Trend {
  if (!spark || spark.length < 2) return { dir: "flat", pct: 0 };
  const mid = Math.floor(spark.length / 2);
  const first = spark.slice(0, mid).reduce((a, b) => a + b, 0);
  const second = spark.slice(mid).reduce((a, b) => a + b, 0);
  const delta = second - first;
  const base = first || (second ? 1 : 0);
  const pct = base ? Math.round((delta / base) * 100) : second > 0 ? 100 : 0;
  return { dir: delta > 0 ? "up" : delta < 0 ? "down" : "flat", pct: Math.min(999, Math.abs(pct)) };
}

function TrendBadge({ trend, onDark = false }: { trend: Trend; onDark?: boolean }) {
  const { dir, pct } = trend;
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const tone =
    dir === "up" ? "#63b81e" : dir === "down" ? "#ef4444" : onDark ? "rgba(255,255,255,0.6)" : "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums"
      style={{
        background: onDark ? "rgba(255,255,255,0.12)" : `color-mix(in srgb, ${tone} 14%, transparent)`,
        color: dir === "flat" && onDark ? "rgba(255,255,255,0.7)" : tone,
      }}
    >
      <Icon size={11} strokeWidth={2.8} />
      {dir === "flat" ? "steady" : `${pct}%`}
    </span>
  );
}

function Sparkline({ data, color, width = 96, height = 30 }: { data: number[]; color: string; width?: number; height?: number }) {
  const series = data && data.length ? data : [0, 0];
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const pts = series.map((v, i) => [i * step, height - (v / max) * (height - 4) - 2] as const);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="2.6" fill={color} />}
    </svg>
  );
}

function Ring({
  pct,
  size,
  stroke,
  from,
  to,
  track = "rgba(255,255,255,0.16)",
  id,
  children,
}: {
  pct: number;
  size: number;
  stroke: number;
  from: string;
  to: string;
  track?: string;
  id: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const off = c * (1 - clamped / 100);
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

/* ── main section ────────────────────────────────────────────────────── */

export function TopPerformersSection({ performers }: { performers: TopPerformer[] }) {
  const champion = performers[0];
  const runners = performers.slice(1, 3);
  const rest = performers.slice(3, 10);

  const maxDone = Math.max(1, champion?.doneCount ?? 1);
  const teamTotal = performers.reduce((n, p) => n + p.doneCount, 0);
  const championShare = teamTotal > 0 && champion ? Math.round((champion.doneCount / teamTotal) * 100) : 0;

  return (
    <section
      className="premium-card rounded-section bg-surface-card border border-hairline p-7 max-md:p-5 flex flex-col"
      style={{ opacity: 0, animation: "fadeUp 500ms ease-out 500ms forwards" }}
    >
      <header className="mb-5 flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #0180cf, #63b81e)", boxShadow: "0 12px 26px -12px rgba(1,128,207,0.7)" }}
        >
          <Gauge size={22} strokeWidth={2.2} />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-display-lg text-ink-strong">Performance Intelligence</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#63b81e]/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#3f7a14]">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#63b81e] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#63b81e]" />
              </span>
              Live
            </span>
          </div>
          <p className="text-body-lg text-ink-subtle mt-0.5">Productivity leaders &amp; weekly momentum this period</p>
        </div>
      </header>

      {performers.length === 0 || !champion ? (
        <EmptyState />
      ) : (
        <>
          {/* team aggregate strip */}
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <MiniStat icon={Flame} label="Completed" value={teamTotal} from="#0180cf" to="#0069b3" />
            <MiniStat icon={Users} label="Contributors" value={performers.length} from="#63b81e" to="#3f7a14" />
            <MiniStat icon={Activity} label="Top share" value={championShare} suffix="%" from="#0069b3" to="#0180cf" />
          </div>

          {/* champion spotlight */}
          <ChampionCard champion={champion} share={championShare} />

          {/* runners-up */}
          {runners.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 max-md:grid-cols-1">
              {runners.map((p) => (
                <RunnerCard key={p.employeeId} performer={p} pctOfLeader={Math.round((p.doneCount / maxDone) * 100)} />
              ))}
            </div>
          )}

          {/* leaderboard */}
          {rest.length > 0 && (
            <ol className="mt-3 flex flex-col gap-1.5">
              {rest.map((p) => (
                <LeaderRow key={p.employeeId} performer={p} pctOfLeader={Math.round((p.doneCount / maxDone) * 100)} />
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  suffix,
  from,
  to,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  suffix?: string;
  from: string;
  to: string;
}) {
  const v = useCountUp(value, 900);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-soft px-3 py-2.5">
      <span className="absolute inset-x-0 top-0 h-[2.5px]" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink-subtle">
        <Icon size={12} strokeWidth={2.4} style={{ color: to }} />
        {label}
      </div>
      <div className="mt-1 tabular-nums font-black text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {v}
        {suffix}
      </div>
    </div>
  );
}

function ChampionCard({ champion, share }: { champion: TopPerformer; share: number }) {
  const animated = useCountUp(champion.doneCount, 1000);
  const trend = trendOf(champion.weeklySparkline);
  return (
    <Link
      href={`/tasks?initiator=${champion.employeeId}` as Route}
      aria-label={`Open ${champion.employeeName}'s tasks — champion, ${champion.doneCount} done`}
      className="group relative block overflow-hidden rounded-[22px] p-5 text-white transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "linear-gradient(125deg, #06243f 0%, #08233a 45%, #06352b 100%)",
        boxShadow: "0 26px 58px -28px rgba(3,30,55,0.75), 0 0 0 1px rgba(255,255,255,0.06) inset",
      }}
    >
      {/* glow + shimmer */}
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,184,30,0.4), transparent 68%)", filter: "blur(20px)" }} />
      <span aria-hidden className="pointer-events-none absolute -left-14 bottom-[-3rem] h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(1,128,207,0.45), transparent 68%)", filter: "blur(22px)" }} />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[200%] -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%]" />

      <div className="relative flex items-center gap-4 max-md:flex-col max-md:text-center">
        {/* ring + avatar */}
        <Ring pct={100} size={92} stroke={7} from="#FCD34D" to="#F59E0B" id={`champ-${champion.employeeId}`}>
          <span className="relative">
            <EmployeeAvatar name={champion.employeeName} size="lg" background="linear-gradient(135deg, #FCD34D, #F59E0B 60%, #B45309)" />
            <span aria-hidden className="absolute -right-1.5 -top-2 text-[#FCD34D]" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.4))" }}>
              <Crown size={18} strokeWidth={2.4} fill="currentColor" />
            </span>
          </span>
        </Ring>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.16em] text-[#FCD34D]">
            <Crown size={12} strokeWidth={2.6} fill="currentColor" /> Production Champion
          </div>
          <div className="mt-0.5 truncate text-[19px] font-black tracking-[-0.01em]">{champion.employeeName}</div>

          <div className="mt-2 flex items-end gap-3 max-md:justify-center">
            <span className="tabular-nums font-black leading-none" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontSize: 46, letterSpacing: "-0.03em" }}>
              {animated}
            </span>
            <div className="mb-1 flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/55">Tasks done</span>
              <div className="flex items-center gap-1.5">
                <TrendBadge trend={trend} onDark />
                <span className="text-[11px] font-semibold text-white/55">{share}% of team</span>
              </div>
            </div>
          </div>
        </div>

        {/* weekly trend chart */}
        <div className="shrink-0 max-md:mt-1">
          <div className="mb-1 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-white/45 max-md:text-center">This week</div>
          <Sparkline data={champion.weeklySparkline} color="#63b81e" />
        </div>
      </div>
    </Link>
  );
}

function RunnerCard({ performer, pctOfLeader }: { performer: TopPerformer; pctOfLeader: number }) {
  const trend = trendOf(performer.weeklySparkline);
  const ringFrom = performer.rank === 2 ? "#cbd5e1" : "#fdba74";
  const ringTo = performer.rank === 2 ? "#64748b" : "#c2410c";
  return (
    <Link
      href={`/tasks?initiator=${performer.employeeId}` as Route}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-hairline bg-surface-card p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-hairline-strong"
      style={{ boxShadow: "0 8px 24px -18px rgba(15,40,80,0.3)" }}
    >
      <Ring pct={pctOfLeader} size={52} stroke={5} from={ringFrom} to={ringTo} track="rgba(15,23,42,0.08)" id={`run-${performer.employeeId}`}>
        <span className="text-[12px] font-black tabular-nums text-ink-muted">#{performer.rank}</span>
      </Ring>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <EmployeeAvatar name={performer.employeeName} size="sm" />
          <span className="truncate text-[14px] font-bold text-ink-strong">{performer.employeeName}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="tabular-nums text-[20px] font-black leading-none text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", letterSpacing: "-0.02em" }}>
            {performer.doneCount}
          </span>
          <TrendBadge trend={trend} />
        </div>
      </div>
    </Link>
  );
}

function LeaderRow({ performer, pctOfLeader }: { performer: TopPerformer; pctOfLeader: number }) {
  const trend = trendOf(performer.weeklySparkline);
  return (
    <li>
      <Link
        href={`/tasks?initiator=${performer.employeeId}` as Route}
        className="leader-row group flex cursor-pointer items-center gap-3 rounded-chip border border-transparent px-3 py-2 transition-all hover:border-hairline"
        style={{ background: "var(--color-surface-soft)" }}
      >
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-ink-muted" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
          {performer.rank}
        </span>
        <EmployeeAvatar name={performer.employeeName} size="sm" />
        <span className="w-28 shrink-0 truncate text-[14px] font-bold text-ink-strong max-md:w-20">{performer.employeeName}</span>
        {/* achievement bar */}
        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-surface-track)" }}>
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(6, pctOfLeader)}%`, background: "linear-gradient(90deg, #0180cf, #63b81e)" }} />
        </span>
        <TrendBadge trend={trend} />
        <span className="w-8 shrink-0 text-right tabular-nums text-[16px] font-black text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
          {performer.doneCount}
        </span>
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10" style={{ background: "var(--color-surface-soft)", border: "1px dashed var(--color-hairline-strong)", borderRadius: 16 }}>
      <span aria-hidden className="inline-flex size-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg, #0180cf, #63b81e)" }}>
        <Inbox size={26} strokeWidth={2} />
      </span>
      <p className="mt-3 font-bold" style={{ fontSize: 17, color: "var(--color-ink-strong)" }}>
        No performance data yet
      </p>
      <p className="mt-1" style={{ fontSize: 14, color: "var(--color-ink-muted)" }}>
        Once tasks start hitting Done or Approved, your performance leaders appear here.
      </p>
    </div>
  );
}
