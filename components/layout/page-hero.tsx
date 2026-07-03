"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Counter } from "@/components/dashboard/count-up";

export interface HeroStat {
  label: string;
  value: number;
  icon: LucideIcon;
  from: string;
  to: string;
}

/**
 * PageHero — the app's reusable "command banner" (light premium glass). A soft
 * blue→green gradient on white with drifting glow blobs and a faint icon
 * watermark; carries an eyebrow, gradient title, subtitle, an icon chip,
 * optional animated stat tiles and an actions slot. Anchors major screens with
 * the same language as the dashboard hero.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  Icon,
  stats,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  Icon?: LucideIcon;
  stats?: HeroStat[];
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-white/80 px-9 py-8 max-md:px-5 max-md:py-6"
      style={{
        background: "linear-gradient(120deg, #e9f3fd 0%, #ffffff 46%, #edf7e3 100%)",
        boxShadow: "0 28px 64px -38px rgba(15,60,100,0.30), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <HeroBackdrop Icon={Icon} />

      <div className="relative flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          {Icon && (
            <span
              className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg max-md:size-12"
              style={{ background: "linear-gradient(135deg, #0180cf, #63b81e)", boxShadow: "0 14px 30px -14px rgba(1,128,207,0.55)" }}
            >
              <Icon size={26} strokeWidth={2.3} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="inline-block size-1.5 rounded-full bg-[#63b81e] shadow-[0_0_8px_#63b81e88]" />
                {eyebrow}
              </div>
            )}
            <h1
              className="mt-1.5"
              style={{
                fontFamily: "var(--font-display), system-ui, sans-serif",
                fontWeight: 900,
                fontSize: "clamp(26px, 3.1vw, 38px)",
                letterSpacing: "-0.035em",
                lineHeight: 1.03,
                width: "fit-content",
                background: "linear-gradient(95deg, #0069b3 0%, #0180cf 42%, #4e9e2e 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
            >
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-[14px] text-slate-500 max-w-2xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="relative flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div
          className="relative mt-7 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}
        >
          {stats.map((s) => (
            <HeroStatTile key={s.label} stat={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HeroBackdrop({ Icon }: { Icon?: LucideIcon }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.6]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(1,128,207,0.06) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      <div className="hero-anim absolute -left-28 -top-32 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, rgba(1,128,207,0.16), transparent 66%)", filter: "blur(30px)", animation: "heroFloat1 16s ease-in-out infinite" }} />
      <div className="hero-anim absolute right-[-7rem] top-[18%] h-[440px] w-[440px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99,184,30,0.15), transparent 66%)", filter: "blur(34px)", animation: "heroFloat2 20s ease-in-out infinite" }} />
      {Icon && <Icon className="absolute -right-8 -top-10 text-slate-900 opacity-[0.04] max-md:hidden" size={260} strokeWidth={1.2} />}
    </div>
  );
}

function HeroStatTile({ stat }: { stat: HeroStat }) {
  const Icon = stat.icon;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${stat.from}, ${stat.to})` }} />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[200%] -skew-x-12 bg-gradient-to-r from-transparent via-slate-100/80 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[260%]" />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{stat.label}</span>
        <span className="inline-flex size-7 items-center justify-center rounded-lg text-white shadow" style={{ background: `linear-gradient(135deg, ${stat.from}, ${stat.to})` }}>
          <Icon size={15} strokeWidth={2.4} />
        </span>
      </div>
      <Counter
        value={stat.value}
        className="relative mt-2.5 block tabular-nums text-slate-900"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(26px, 2.6vw, 36px)", letterSpacing: "-0.025em", lineHeight: 1 }}
      />
    </div>
  );
}
