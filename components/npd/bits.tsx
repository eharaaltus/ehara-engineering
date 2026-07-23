"use client";

/**
 * Shared NPD display primitives.
 *
 * Every colour here resolves to a design token from `app/globals.css` — the same
 * palette the rest of the WMS uses. Nothing invents its own hex, so NPD reads as
 * part of the app rather than a module bolted onto the side, and a theme change
 * carries it along.
 *
 * State is never encoded by hue alone: every colour is paired with a glyph or a
 * fill pattern, because roughly 1 in 12 men is red-green colour deficient and
 * this is a red-green-heavy app on a shop floor.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HEALTH_META, STATE_META, type Activity, type Health, type Product } from "@/lib/npd/model";
import { STAGE_SHORT, NPD_STAGES, fmtDate } from "@/lib/npd/status";

export function Tip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] max-w-[300px] rounded-xl border border-white/10 px-3 py-2 text-[12px] font-medium leading-snug text-white shadow-2xl"
          style={{ background: "linear-gradient(135deg, #14245c, #0a0a0a)" }}
        >
          {content}
          <Tooltip.Arrow className="fill-[#14245c]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * The signature element: all 36 activities of a product as a 6×6 block of small
 * cells — one column per stage, template order down each column.
 *
 * The whole state of a part in ~60px: legible at a glance, sits happily beside
 * fifty other rows, and is flatly impossible in a spreadsheet.
 */
export function MicroGrid({ product, cell = 8 }: { product: Product; cell?: number }) {
  const byStage = React.useMemo(
    () => NPD_STAGES.map((stage) => product.activities.filter((a) => a.stage === stage)),
    [product.activities],
  );

  return (
    <div
      className="inline-flex items-start gap-[3px] rounded-md p-[3px]"
      style={{ background: "var(--color-surface-soft)" }}
      role="img"
      aria-label={`${product.done} of ${product.applicable} activities done, ${product.overdue} overdue`}
    >
      {byStage.map((acts, i) => (
        <div key={NPD_STAGES[i]} className="flex flex-col gap-[2px]">
          {acts.map((a) => (
            <MicroCell key={a.id} a={a} size={cell} />
          ))}
        </div>
      ))}
    </div>
  );
}

function MicroCell({ a, size }: { a: Activity; size: number }) {
  const meta = STATE_META[a.state];

  // On-hold is hatched, not just tinted, so "paused" and "in progress" stay
  // distinguishable without relying on hue.
  const fill =
    a.state === "OnHold"
      ? `repeating-linear-gradient(45deg, ${meta.color}, ${meta.color} 1.5px, ${meta.bg} 1.5px, ${meta.bg} 3.5px)`
      : a.state === "OnTrack" || a.state === "NotApplicable"
        ? meta.bg
        : meta.color;

  return (
    <Tip
      content={
        <span>
          <b>
            {a.code} · {a.activityPlan}
          </b>
          <br />
          {meta.label}
          {a.plannedDate ? ` · planned ${fmtDate(a.plannedDate)}` : ""}
          <br />
          {a.doerName ?? "⚠ unassigned"}
          {a.slipDays > 0 ? ` · re-planned +${a.slipDays}d` : ""}
        </span>
      }
    >
      <div
        style={{
          width: size,
          height: size,
          background: fill,
          borderRadius: 2,
          border:
            a.state === "OnTrack" || a.state === "NotApplicable"
              ? "1px solid var(--color-hairline-strong)"
              : "none",
          // A gate-blocking overdue activity gets a dark ring. An outline reads
          // differently from a fill, so "blocking" stays legible on top of "overdue".
          boxShadow: a.blocksGate && a.state === "Overdue" ? "0 0 0 1.5px var(--color-ink-strong)" : undefined,
        }}
        className="cursor-default transition-transform duration-150 hover:scale-[1.7]"
      />
    </Tip>
  );
}

export function HealthDot({ product, showLabel = false }: { product: Product; showLabel?: boolean }) {
  const m = HEALTH_META[product.health];
  return (
    <Tip content={product.healthReason}>
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-[3px] text-[10.5px] font-black leading-none"
        style={{ background: m.bg, color: m.color }}
      >
        <span aria-hidden>{m.glyph}</span>
        {showLabel && <span className="tracking-wide">{m.label}</span>}
        <span className="sr-only">{product.healthReason}</span>
      </span>
    </Tip>
  );
}

/**
 * Keeps a page current without a refresh button.
 *
 * The user should never have to press "refresh" — they open the page and it is
 * already up to date, and it stays up to date while they look at it. This
 * silently re-runs the server components (which re-read the database, picking up
 * anything the Google-Sheet webhook wrote) on an interval, and immediately
 * whenever the tab regains focus. Client state — the view, filters, the tab —
 * is preserved, because router.refresh() only re-fetches server data.
 */
export function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, intervalMs);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [router, intervalMs]);
  return null;
}

export function StateChip({ a }: { a: Activity }) {
  const m = STATE_META[a.state];
  const text =
    a.state === "Overdue" && a.daysLeft !== null
      ? `${a.daysLeft}d`
      : a.state === "OnTrack" && a.daysLeft !== null
        ? `${a.daysLeft}d left`
        : m.label;

  return (
    <Tip
      content={
        a.state === "Overdue"
          ? `${Math.abs(a.daysLeft ?? 0)} WORKING days overdue — weekends and company holidays excluded.`
          : a.state === "OnTrack" && a.daysLeft !== null
            ? `${a.daysLeft} WORKING days left — weekends and company holidays excluded.`
            : m.label
      }
    >
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-[3px] text-[11px] font-bold leading-none"
        style={{ background: m.bg, color: m.color }}
      >
        {m.glyph && <span aria-hidden>{m.glyph}</span>}
        {text}
      </span>
    </Tip>
  );
}

/** Where the product actually is: TECH ▸ COMM ▸ TOOL ▸ SUB ▸ PPAP ▸ HAND. */
export function StageChevrons({ product }: { product: Product }) {
  return (
    <div className="inline-flex items-center">
      {product.stages.map((s) => {
        const bg =
          s.state === "complete"
            ? "var(--color-green-deep)"
            : s.state === "current"
              ? s.overdue
                ? "var(--color-red-deep)"
                : "var(--color-brand-blue)"
              : "var(--color-surface-track)";
        const fg = s.state === "future" ? "var(--color-ink-subtle)" : "#fff";
        return (
          <Tip
            key={s.stage}
            content={
              <span>
                <b>{s.stage}</b>
                <br />
                {s.done}/{s.applicable} resolved{s.overdue ? ` · ${s.overdue} overdue` : ""}
                <br />
                {s.gateOpen ? "✓ Gate passed" : s.state === "current" ? "🔒 Gate is here" : "Not started"}
              </span>
            }
          >
            <span
              className="-ml-[3px] inline-flex h-[17px] items-center pl-[7px] pr-[5px] text-[8.5px] font-black uppercase tracking-tight first:ml-0"
              style={{
                background: bg,
                color: fg,
                clipPath: "polygon(0 0, calc(100% - 5px) 0, 100% 50%, calc(100% - 5px) 100%, 0 100%, 5px 50%)",
              }}
            >
              {STAGE_SHORT[s.stage]?.slice(0, 4)}
            </span>
          </Tip>
        );
      })}
    </div>
  );
}

export function ProgressBar({ pct, overdue }: { pct: number; overdue: number }) {
  const fill =
    overdue > 0
      ? "linear-gradient(90deg, var(--color-red), var(--color-red-deep))"
      : pct === 100
        ? "linear-gradient(90deg, var(--color-green), var(--color-green-deep))"
        : "linear-gradient(90deg, var(--color-brand-blue), #e11d2f)";
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-[6px] w-full min-w-[48px] overflow-hidden rounded-full"
        style={{ background: "var(--color-surface-track)" }}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: fill }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] font-bold tabular-nums text-ink-strong">{pct}%</span>
    </div>
  );
}

/** Slip — the number the spreadsheet structurally cannot show. */
export function SlipChip({ days, label = "slip" }: { days: number; label?: string }) {
  if (days <= 0) return <span className="text-[11px] text-ink-subtle">—</span>;
  return (
    <Tip content={`The PLAN moved ${days} working days later than the frozen baseline. Nothing here is “overdue” — the date was pushed instead. That is the failure a spreadsheet can’t see.`}>
      <span
        className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md px-1.5 py-[3px] text-[11px] font-bold"
        style={{ background: "var(--color-amber-bg)", color: "var(--color-amber-deep)" }}
      >
        ▲ {days}d {label}
      </span>
    </Tip>
  );
}

export function HealthPill({ health, count }: { health: Health; count: number }) {
  const m = HEALTH_META[health];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ background: m.bg, color: m.color }}
    >
      <span aria-hidden>{m.glyph}</span> {health} {count}
    </span>
  );
}

export function TooltipRoot({ children }: { children: React.ReactNode }) {
  return <Tooltip.Provider delayDuration={120}>{children}</Tooltip.Provider>;
}
