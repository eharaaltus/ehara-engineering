"use client";

/**
 * A single product, full page — reached by deep-link or the drawer's "open full
 * page". Same computed model, same design tokens, same inline editing as
 * everywhere else. The 36 activities are the shared StageList; product actions
 * are the shared menu; so this page is mostly layout.
 */

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle, CalendarClock, Factory } from "lucide-react";
import { type Product } from "@/lib/npd/model";
import { STAGE_SHORT, fmtDate } from "@/lib/npd/status";
import { MicroGrid, HealthDot, ProgressBar, StageChevrons, AutoRefresh, Tip, TooltipRoot } from "@/components/npd/bits";
import { StageList } from "@/components/npd/activity-list";
import { ProductActionsMenu } from "@/components/npd/product-actions";

type Emp = { id: string; name: string };

export function ProductDetail({ product, employees }: { product: Product; employees: Emp[] }) {
  const router = useRouter();
  const late = product.varianceDays > 0;

  return (
    <TooltipRoot>
      <AutoRefresh />

      {/* Breadcrumb + title */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={"/npd" as Route} className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-subtle transition-colors hover:text-[var(--color-brand-blue)]">
            <ChevronLeft size={14} /> Products
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)", boxShadow: "0 14px 30px -14px rgba(30,64,175,0.55)" }}>
              <Factory size={22} strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(22px,2.6vw,32px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
                {product.partName}
              </h1>
              <p className="mt-0.5 truncate text-[13px] text-ink-subtle">
                <span className="font-bold text-ink-muted">#{product.srNo ?? "—"}</span>
                {" · "}{product.customer ?? "—"}{product.partNo ? ` · ${product.partNo}` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HealthDot product={product} showLabel />
          <ProductActionsMenu product={product} employees={employees} size="md" onDeleted={() => router.push("/npd" as Route)} />
        </div>
      </div>

      {/* Summary card */}
      <div className="premium-card mb-5 rounded-2xl border bg-white p-5" style={{ borderColor: "var(--color-hairline-strong)" }}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-[220px] flex-1">
            <StageChevrons product={product} />
            <div className="mt-3 max-w-md"><ProgressBar pct={product.pct} overdue={product.overdue} /></div>
            <p className="mt-2 text-[12.5px] text-ink-muted">{product.healthReason}</p>
          </div>
          <MicroGrid product={product} cell={12} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Metric label="Applicable" value={product.applicable} />
          <Metric label="Done" value={product.done} tone="green" />
          <Metric label="Overdue" value={product.overdue} tone={product.overdue ? "red" : undefined} />
          <Metric label="On hold" value={product.onHold} />
          <Metric label="Slip" value={product.slipDays ? `${product.slipDays}d` : "—"} tone={product.slipDays ? "amber" : undefined} hint="Worst open activity re-planned past its frozen baseline, in working days." />
          <DateMetric label="Target" value={product.targetEndDate} />
          <DateMetric label="Forecast" value={product.forecastEnd} tone={late ? "red" : "green"} suffix={late ? `+${product.varianceDays}d` : undefined} hint={product.baselineEndDate ? `Committed baseline ${fmtDate(product.baselineEndDate)}. ${late ? `${product.varianceDays} working days late to that promise.` : "On or ahead of the original promise."}` : "No baseline frozen for this product."} />
        </div>
      </div>

      {/* Gate blockers callout */}
      {product.gateBlockers.length > 0 && product.currentStage && (
        <div className="mb-5 rounded-2xl border p-4" style={{ background: "var(--color-amber-bg)", borderColor: "var(--color-amber)" }}>
          <div className="flex items-center gap-2 text-[13px] font-black" style={{ color: "var(--color-amber-deep)" }}>
            <AlertTriangle size={16} /> {product.gateBlockers.length} activit{product.gateBlockers.length === 1 ? "y" : "ies"} holding the {STAGE_SHORT[product.currentStage]} gate shut
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.gateBlockers.map((a) => (
              <span key={a.id} className="rounded-md bg-white/70 px-2 py-1 text-[11.5px] font-bold" style={{ color: "var(--color-amber-deep)" }}>
                {a.code} · {a.activityPlan.slice(0, 40)}{a.activityPlan.length > 40 ? "…" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <StageList product={product} employees={employees} />
    </TooltipRoot>
  );
}

function Metric({ label, value, tone, hint }: { label: string; value: React.ReactNode; tone?: "green" | "red" | "amber"; hint?: string }) {
  const color = tone === "green" ? "var(--color-green-deep)" : tone === "red" ? "var(--color-red-deep)" : tone === "amber" ? "var(--color-amber-deep)" : "var(--color-ink)";
  const body = (
    <div className="rounded-xl border bg-[var(--color-surface-soft)] px-3 py-2.5" style={{ borderColor: "var(--color-hairline)" }}>
      <div className="text-[10px] font-black uppercase tracking-wide text-ink-subtle">{label}</div>
      <div className="mt-0.5 text-[22px] font-black leading-none tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
  return hint ? <Tip content={hint}>{body}</Tip> : body;
}

function DateMetric({ label, value, tone, suffix, hint }: { label: string; value: string | null; tone?: "green" | "red"; suffix?: string; hint?: string }) {
  const color = tone === "red" ? "var(--color-red-deep)" : tone === "green" ? "var(--color-green-deep)" : "var(--color-ink)";
  const body = (
    <div className="rounded-xl border bg-[var(--color-surface-soft)] px-3 py-2.5" style={{ borderColor: "var(--color-hairline)" }}>
      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-ink-subtle"><CalendarClock size={11} /> {label}</div>
      <div className="mt-0.5 text-[15px] font-black leading-tight" style={{ color }}>{fmtDate(value)}{suffix && <span className="ml-1 text-[11px]">{suffix}</span>}</div>
    </div>
  );
  return hint ? <Tip content={hint}>{body}</Tip> : body;
}
