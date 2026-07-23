"use client";

/**
 * The right-side product drawer.
 *
 * Click a product anywhere in the list and this slides in — the product's full
 * detail AND its task tracker (all 36 activities, inline-editable) without ever
 * leaving the Products page. It's the "peek" pattern: review and edit many
 * products in a row without the navigate-in, navigate-back churn.
 *
 * Product actions (Edit / Duplicate / Archive / Delete) live in the header, and
 * "Open full page" is there for when you want the deep-linkable route.
 */

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ExternalLink, CalendarClock, AlertTriangle, ListChecks } from "lucide-react";
import { type Product } from "@/lib/npd/model";
import { STAGE_SHORT, fmtDate } from "@/lib/npd/status";
import { MicroGrid, HealthDot, ProgressBar, StageChevrons, Tip, TooltipRoot } from "@/components/npd/bits";
import { StageList } from "@/components/npd/activity-list";
import { ProductActionsMenu } from "@/components/npd/product-actions";

type Emp = { id: string; name: string };

export function ProductDrawer({
  product, employees, open, onOpenChange,
}: {
  product: Product | null;
  employees: Emp[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const late = product ? product.varianceDays > 0 : false;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0a0a0a]/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-[60] flex w-[min(760px,96vw)] flex-col border-l border-white/60 bg-[var(--color-canvas-base)] shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
          aria-describedby={undefined}
        >
          {product ? (
            <TooltipRoot>
              {/* Header */}
              <div className="shrink-0 border-b border-hairline bg-white px-6 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md px-1.5 py-0.5 text-[11px] font-black" style={{ background: "var(--color-blue-bg)", color: "var(--color-brand-blue)" }}>
                        #{product.srNo ?? "—"}
                      </span>
                      <HealthDot product={product} showLabel />
                    </div>
                    <Dialog.Title
                      className="mt-1.5 truncate text-ink-strong"
                      style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(19px,2.2vw,26px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
                    >
                      {product.partName}
                    </Dialog.Title>
                    <p className="mt-0.5 truncate text-[13px] text-ink-subtle">
                      {product.customer ?? "—"}{product.partNo ? ` · ${product.partNo}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ProductActionsMenu product={product} employees={employees} size="md" onDeleted={() => onOpenChange(false)} />
                    <Link
                      href={`/npd/${product.id}` as Route}
                      className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink-soft shadow-sm transition hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
                      title="Open full page"
                    >
                      <ExternalLink size={16} />
                    </Link>
                    <Dialog.Close className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink-soft shadow-sm transition hover:bg-[var(--color-surface-soft)]">
                      <X size={17} />
                    </Dialog.Close>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-4">
                  <StageChevrons product={product} />
                  <MicroGrid product={product} cell={9} />
                </div>
                <div className="mt-3 max-w-md"><ProgressBar pct={product.pct} overdue={product.overdue} /></div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Done" value={`${product.done}/${product.applicable}`} />
                  <Metric label="Overdue" value={product.overdue} tone={product.overdue ? "red" : undefined} />
                  <Metric label="Slip" value={product.slipDays ? `${product.slipDays}d` : "—"} tone={product.slipDays ? "amber" : undefined} />
                  <Metric label="Forecast" value={fmtDate(product.forecastEnd)} tone={late ? "red" : "green"} suffix={late ? `+${product.varianceDays}d` : undefined} icon />
                </div>
              </div>

              {/* Body — the product's task tracker */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                {product.gateBlockers.length > 0 && product.currentStage && (
                  <div className="mb-4 rounded-xl border p-3" style={{ background: "var(--color-amber-bg)", borderColor: "var(--color-amber)" }}>
                    <div className="flex items-center gap-2 text-[12.5px] font-black" style={{ color: "var(--color-amber-deep)" }}>
                      <AlertTriangle size={15} /> {product.gateBlockers.length} activit{product.gateBlockers.length === 1 ? "y" : "ies"} holding the {STAGE_SHORT[product.currentStage]} gate shut
                    </div>
                  </div>
                )}
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide text-ink-subtle">
                  <ListChecks size={14} /> Task tracker — {product.applicable} activities
                </div>
                <StageList product={product} employees={employees} compact />
              </div>
            </TooltipRoot>
          ) : (
            <div className="flex h-full items-center justify-center text-ink-subtle">No product selected.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The list variant, opened by the top KPI cards. "Needs attention" → the
 * critical products; "Overdue" → the products carrying overdue activities. Each
 * row opens that product's full drawer, so a number drills straight to the work.
 */
export function ListDrawer({
  title, subtitle, products, open, onOpenChange, onPick,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (p: Product) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0a0a0a]/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-[60] flex w-[min(560px,96vw)] flex-col border-l border-white/60 bg-[var(--color-canvas-base)] shadow-2xl outline-none"
          aria-describedby={undefined}
        >
          <TooltipRoot>
            <div className="shrink-0 border-b border-hairline bg-white px-6 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Dialog.Title className="text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "22px", letterSpacing: "-0.02em" }}>
                    {title}
                  </Dialog.Title>
                  {subtitle && <p className="mt-0.5 text-[13px] text-ink-subtle">{subtitle}</p>}
                </div>
                <Dialog.Close className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink-soft shadow-sm transition hover:bg-[var(--color-surface-soft)]">
                  <X size={17} />
                </Dialog.Close>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {products.length === 0 ? (
                <div className="p-10 text-center text-[13px] text-ink-subtle">Nothing here — all clear. 🎉</div>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onPick(p)}
                      className="flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:-translate-y-px hover:shadow-md"
                      style={{ borderColor: "var(--color-hairline-strong)" }}
                    >
                      <HealthDot product={p} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-bold text-ink-strong">
                          <span className="text-ink-subtle">#{p.srNo ?? "—"}</span> {p.partName}
                        </div>
                        <div className="truncate text-[11.5px] text-ink-subtle">{p.customer ?? "—"}</div>
                      </div>
                      <div className="w-28 shrink-0"><ProgressBar pct={p.pct} overdue={p.overdue} /></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TooltipRoot>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Metric({
  label, value, tone, suffix, icon,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "green" | "red" | "amber";
  suffix?: string;
  icon?: boolean;
}) {
  const color =
    tone === "green" ? "var(--color-green-deep)" : tone === "red" ? "var(--color-red-deep)" : tone === "amber" ? "var(--color-amber-deep)" : "var(--color-ink)";
  return (
    <div className="rounded-xl border bg-[var(--color-surface-soft)] px-3 py-2" style={{ borderColor: "var(--color-hairline)" }}>
      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-ink-subtle">
        {icon && <CalendarClock size={10} />} {label}
      </div>
      <div className="mt-0.5 text-[16px] font-black leading-none tabular-nums" style={{ color }}>
        {value}{suffix && <span className="ml-1 text-[11px]">{suffix}</span>}
      </div>
    </div>
  );
}
