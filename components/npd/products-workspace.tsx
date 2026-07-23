"use client";

/**
 * The NPD Products workspace — three views over one computed model, in the app's
 * own design language (PageHero, premium-card, the blue→red Ehara gradient, the
 * `--color-*` tokens). Nothing invents its own hex.
 *
 *   Table   dense portfolio grid, the spreadsheet-killer (default)
 *   Gates   stage-readiness matrix — "who is ready for review?"
 *   Board   kanban by CURRENT STAGE — "where is the pipeline clogged?"
 *
 * Clicking a product anywhere opens the right-side drawer: its full detail plus
 * its task tracker, inline-editable, without leaving the page. The top KPI cards
 * are clickable too — each drills into the products behind its number.
 */

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Search, Plus, Table2, Columns3, ShieldCheck, Factory, Download, X, Lock,
  AlertTriangle, ListChecks, Boxes, Flame, ChevronRight, BarChart3, Archive,
} from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { HEALTH_ORDER, HEALTH_META, BRAND, type Health, type Product } from "@/lib/npd/model";
import { NPD_STAGES, STAGE_SHORT, fmtDate } from "@/lib/npd/status";
import { MicroGrid, HealthDot, ProgressBar, StageChevrons, AutoRefresh, Tip, TooltipRoot } from "@/components/npd/bits";
import { Combobox } from "@/components/npd/combobox";
import { ProductActionsMenu } from "@/components/npd/product-actions";
import { ProductDrawer, ListDrawer } from "@/components/npd/product-drawer";

type Emp = { id: string; name: string };
type View = "table" | "gates" | "board";

const VIEWS: { id: View; label: string; icon: React.ReactNode; blurb: string }[] = [
  { id: "table", label: "Table", icon: <Table2 size={15} />, blurb: "Every part, every number" },
  { id: "gates", label: "Gates", icon: <ShieldCheck size={15} />, blurb: "Who is ready for review — and what's missing?" },
  { id: "board", label: "Board", icon: <Columns3 size={15} />, blurb: "Where is the pipeline clogged?" },
];

export function ProductsWorkspace({ products, employees }: { products: Product[]; employees: Emp[] }) {
  const [view, setView] = React.useState<View>("table");
  const [q, setQ] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [health, setHealth] = React.useState<Health | "">("");
  const [showArchived, setShowArchived] = React.useState(false);
  const archivedCount = products.filter((p) => p.archived).length;

  // Drawer state: a product peek, plus a KPI "list" drawer that drills into one.
  // We store the drawer's product by ID and re-derive it from `products`, so an
  // inline edit + auto-refresh flows straight into the open drawer (no effect,
  // no stale copy).
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [productOpen, setProductOpen] = React.useState(false);
  const [list, setList] = React.useState<{ title: string; subtitle: string; products: Product[] } | null>(null);
  const [listOpen, setListOpen] = React.useState(false);
  const drawerProduct = React.useMemo(
    () => (drawerId ? products.find((p) => p.id === drawerId) ?? null : null),
    [drawerId, products],
  );

  const openProduct = React.useCallback((p: Product) => {
    setDrawerId(p.id);
    setListOpen(false);
    setProductOpen(true);
  }, []);

  const customers = React.useMemo(
    () => [...new Set(products.map((p) => p.customer).filter(Boolean) as string[])].sort(),
    [products],
  );

  const visible = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return products
      .filter((p) => (showArchived ? p.archived : !p.archived))
      .filter((p) => (customer ? p.customer === customer : true))
      .filter((p) => (health ? p.health === health : true))
      .filter((p) =>
        !query
          ? true
          : p.partName.toLowerCase().includes(query) ||
            (p.partNo ?? "").toLowerCase().includes(query) ||
            (p.customer ?? "").toLowerCase().includes(query) ||
            String(p.srNo ?? "").includes(query),
      )
      .sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || (a.srNo ?? 1e9) - (b.srNo ?? 1e9));
  }, [products, q, customer, health, showArchived]);

  const live = products.filter((p) => !p.archived);
  const kpi = {
    parts: live,
    critical: live.filter((p) => p.health === "Critical"),
    overdue: live.filter((p) => p.overdue > 0),
    blockers: live.filter((p) => p.gateBlockers.some((a) => a.state === "Overdue")),
  };
  const openList = (title: string, subtitle: string, ps: Product[]) => {
    setList({ title, subtitle, products: ps });
    setProductOpen(false);
    setListOpen(true);
  };

  const filtering = Boolean(q || customer || health);

  return (
    <TooltipRoot>
      <AutoRefresh />

      <PageHero
        eyebrow="New Product Development"
        title="Products"
        subtitle="Every part across 6 stages and 36 activities. Click any product to open it on the right — details and its task tracker, no page change."
        Icon={Factory}
        actions={
          <>
            <Link
              href={"/npd/dashboard" as Route}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-extrabold text-ink-strong shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
            >
              <BarChart3 size={16} strokeWidth={2.5} /> Dashboard
            </Link>
            <Link
              href={"/npd/tracker" as Route}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-extrabold text-ink-strong shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
            >
              <ListChecks size={16} strokeWidth={2.5} /> Task Tracker
            </Link>
            <Link
              href={"/npd/new" as Route}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: BRAND.gradient, boxShadow: "0 14px 30px -14px rgba(30,64,175,0.6)" }}
            >
              <Plus size={17} strokeWidth={2.8} /> New Product
            </Link>
          </>
        }
      />

      {/* ── Clickable KPI cards — each drills into the products behind it ─── */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active parts" value={kpi.parts.length} icon={<Boxes size={16} />} from="#1e40af" to="#3b82f6"
          onClick={() => openList("Active parts", "Every product currently in development", kpi.parts)} />
        <KpiCard label="Needs attention" value={kpi.critical.length} icon={<Flame size={16} />} from="#e11d2f" to="#f43f5e"
          onClick={() => openList("Needs attention", "Products that are critical right now", kpi.critical)} />
        <KpiCard label="Overdue" value={kpi.overdue.length} icon={<AlertTriangle size={16} />} from="#b45309" to="#f59e0b"
          onClick={() => openList("Products with overdue work", "At least one activity past its planned date", kpi.overdue)} />
        <KpiCard label="Blocking a gate" value={kpi.blockers.length} icon={<Lock size={16} />} from="#7c3aed" to="#a855f7"
          onClick={() => openList("Blocked at a gate", "Overdue activities holding the current stage shut", kpi.blockers)} />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[210px] flex-1 max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search part, number, customer…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] text-ink-strong shadow-sm outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[rgba(30,64,175,0.10)]"
          />
        </div>
        <Combobox
          value={customer}
          onChange={setCustomer}
          options={customers.map((c) => ({ value: c, label: c }))}
          placeholder="All customers"
          searchPlaceholder="Search customer…"
        />
        <Combobox
          value={health}
          onChange={(v) => setHealth(v as Health | "")}
          options={(["Critical", "At Risk", "Good", "Done"] as Health[]).map((h) => ({ value: h, label: HEALTH_META[h].label }))}
          placeholder="All health"
          searchPlaceholder="Search…"
          widthClass="min-w-[140px]"
        />
        {filtering && (
          <button
            onClick={() => { setQ(""); setCustomer(""); setHealth(""); }}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-ink-subtle shadow-sm transition hover:text-ink-strong"
          >
            <X size={13} /> Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {(archivedCount > 0 || showArchived) && (
            <Tip content={showArchived ? "Back to active products" : "View archived products — restore any from its ⋯ menu"}>
              <button
                onClick={() => setShowArchived((s) => !s)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-bold shadow-sm transition"
                style={
                  showArchived
                    ? { background: "var(--color-ink-strong)", color: "#fff", borderColor: "transparent" }
                    : { background: "#fff", color: "var(--color-ink-subtle)", borderColor: "var(--color-hairline-strong)" }
                }
              >
                <Archive size={14} /> Archived
                <span className="rounded-full px-1.5 py-px text-[10px] font-black tabular-nums" style={{ background: showArchived ? "rgba(255,255,255,0.22)" : "var(--color-surface-track)" }}>
                  {archivedCount}
                </span>
              </button>
            </Tip>
          )}
          <LiveTag />
          <button
            onClick={() => exportCsv(visible)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-ink-subtle shadow-sm transition hover:text-[var(--color-brand-blue)]"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* ── View switcher ────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {VIEWS.map((v) => {
            const on = view === v.id;
            return (
              <Tip key={v.id} content={v.blurb}>
                <button
                  onClick={() => setView(v.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-extrabold transition-all"
                  style={on ? { background: BRAND.gradient, color: "#fff", boxShadow: "0 10px 22px -12px rgba(30,64,175,0.65)" } : { color: "var(--color-ink-subtle)" }}
                >
                  {v.icon} {v.label}
                </button>
              </Tip>
            );
          })}
        </div>
        <span className="text-[12.5px] font-semibold text-ink-subtle">
          {showArchived ? `${visible.length} archived` : `${visible.length} of ${live.length} products`}
        </span>
      </div>

      <div className="mt-4">
        {visible.length === 0 ? (
          <Empty>
            {showArchived
              ? "No archived products."
              : filtering
                ? "No products match these filters."
                : "No products yet. Click “New Product” — all 36 activities generate themselves on a working-day schedule."}
          </Empty>
        ) : view === "table" ? (
          <TableView products={visible} employees={employees} onOpen={openProduct} onChanged={() => setProductOpen(false)} />
        ) : view === "gates" ? (
          <GatesView products={visible} onOpen={openProduct} />
        ) : (
          <BoardView products={visible} onOpen={openProduct} />
        )}
      </div>

      {/* Drawers */}
      <ProductDrawer product={drawerProduct} employees={employees} open={productOpen} onOpenChange={setProductOpen} />
      <ListDrawer
        title={list?.title ?? ""}
        subtitle={list?.subtitle}
        products={list?.products ?? []}
        open={listOpen}
        onOpenChange={setListOpen}
        onPick={openProduct}
      />
    </TooltipRoot>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TABLE
// ═══════════════════════════════════════════════════════════════════════════

function TableView({
  products, employees, onOpen, onChanged,
}: {
  products: Product[];
  employees: Emp[];
  onOpen: (p: Product) => void;
  onChanged: () => void;
}) {
  return (
    <Panel>
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-[13px]">
          <thead>
            <tr style={{ background: "var(--color-surface-soft)" }}>
              <Th className="w-[54px]">#</Th>
              <Th>Part</Th>
              <Th className="w-[110px]">Customer</Th>
              <Th className="w-[152px]">Stage</Th>
              <Th className="w-[78px]" hint="All 36 activities — one column per stage, plan order downwards. Hover any cell.">36 acts</Th>
              <Th className="w-[140px]">Progress</Th>
              <Th className="w-[72px] text-center">Overdue</Th>
              <Th className="w-[150px]">Next up</Th>
              <Th className="w-[120px]" hint="When the product will REALLY finish, and how many working days past the frozen baseline.">Forecast</Th>
              <Th className="w-[44px]" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpen(p)}
                className="group cursor-pointer border-t transition-colors hover:bg-[var(--color-surface-soft)]"
                style={{ borderColor: "var(--color-hairline)" }}
              >
                <Td>
                  <span className="rounded-md px-1.5 py-0.5 text-[11px] font-black" style={{ background: "var(--color-blue-bg)", color: "var(--color-brand-blue)" }}>
                    {p.srNo ?? "—"}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5 font-bold text-ink-strong">
                    <HealthDot product={p} />
                    <span className="truncate group-hover:text-[var(--color-brand-blue)]">{p.partName}</span>
                  </div>
                  {p.partNo && <div className="mt-0.5 text-[11px] text-ink-subtle">{p.partNo}</div>}
                </Td>
                <Td className="text-ink-muted">{p.customer ?? "—"}</Td>
                <Td><StageChevrons product={p} /></Td>
                <Td><MicroGrid product={p} cell={7} /></Td>
                <Td><ProgressBar pct={p.pct} overdue={p.overdue} /></Td>
                <Td className="text-center">
                  {p.overdue ? (
                    <span className="inline-flex min-w-[24px] items-center justify-center rounded-md px-1.5 py-[3px] text-[11px] font-black tabular-nums" style={{ background: "var(--color-red-bg)", color: "var(--color-red-deep)" }}>
                      {p.overdue}
                    </span>
                  ) : (
                    <span className="text-ink-subtle">—</span>
                  )}
                </Td>
                <Td>
                  {p.nextUp ? (
                    <Tip content={`${p.nextUp.code} · ${p.nextUp.activityPlan} · ${p.nextUp.doerName ?? "unassigned"}`}>
                      <span className="block truncate text-[12px]">
                        <b className="text-ink-strong">{p.nextUp.code}</b> <span className="text-ink-subtle">{fmtDate(p.nextUp.plannedDate)}</span>
                      </span>
                    </Tip>
                  ) : (
                    <span className="text-ink-subtle">—</span>
                  )}
                </Td>
                <Td><ForecastCell p={p} /></Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <ProductActionsMenu product={p} employees={employees} onDeleted={onChanged} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ForecastCell({ p }: { p: Product }) {
  if (!p.forecastEnd) return <span className="text-ink-subtle">—</span>;
  const late = p.varianceDays > 0;
  return (
    <Tip
      content={
        p.baselineEndDate ? (
          <span>
            Committed (baseline): <b>{fmtDate(p.baselineEndDate)}</b><br />
            Current target: <b>{fmtDate(p.targetEndDate)}</b><br />
            Forecast: <b>{fmtDate(p.forecastEnd)}</b><br />
            {late ? `→ ${p.varianceDays} working days LATE to the original promise.` : "→ On or ahead of the original promise."}
          </span>
        ) : (
          `Forecast ${fmtDate(p.forecastEnd)} — no baseline was frozen, so variance can’t be measured.`
        )
      }
    >
      <span className="whitespace-nowrap text-[12px] font-bold" style={{ color: late ? "var(--color-red-deep)" : "var(--color-ink)" }}>
        {fmtDate(p.forecastEnd)}
        {late && <span className="ml-1 text-[10px] font-black">+{p.varianceDays}d</span>}
      </span>
    </Tip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  GATES
// ═══════════════════════════════════════════════════════════════════════════

function GatesView({ products, onOpen }: { products: Product[]; onOpen: (p: Product) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-muted">
        Rows are parts, columns are the six stages. A gate opens only when <b>every applicable activity</b> in it is
        resolved. Click a part to open it; click a cell to see the blockers in its task tracker.
      </p>
      <Panel>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr style={{ background: "var(--color-surface-soft)" }}>
                <Th>Part</Th>
                {NPD_STAGES.map((s) => <Th key={s} className="text-center">{STAGE_SHORT[s]}</Th>)}
                <Th className="w-[128px]">Gate now</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-hairline)" }}>
                  <Td>
                    <button onClick={() => onOpen(p)} className="flex items-center gap-1.5 text-left font-bold text-ink-strong transition-colors hover:text-[var(--color-brand-blue)]">
                      <HealthDot product={p} />
                      <span className="truncate">{p.partName}</span>
                    </button>
                    <div className="text-[11px] text-ink-subtle">{p.customer ?? "—"}</div>
                  </Td>
                  {p.stages.map((s) => (
                    <Td key={s.stage} className="p-1.5 text-center"><GateCell product={p} stage={s} /></Td>
                  ))}
                  <Td>
                    {p.currentStage ? (
                      <Tip content={p.gateBlockers.length ? `${p.gateBlockers.length} open: ${p.gateBlockers.slice(0, 6).map((a) => a.code).join(", ")}${p.gateBlockers.length > 6 ? "…" : ""}` : "Gate is clear."}>
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-strong">
                          <Lock size={12} className="text-ink-subtle" /> {STAGE_SHORT[p.currentStage]} <span className="text-ink-subtle">({p.gateBlockers.length})</span>
                        </span>
                      </Tip>
                    ) : (
                      <span className="text-[12px] font-bold" style={{ color: "var(--color-green-deep)" }}>✓ All passed</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function GateCell({ product, stage }: { product: Product; stage: Product["stages"][number] }) {
  const blockers = product.activities.filter((a) => a.stage === stage.stage && a.isOpen);
  const [bg, fg] =
    stage.applicable === 0
      ? ["var(--color-stone-bg)", "var(--color-stone-deep)"]
      : stage.gateOpen
        ? ["var(--color-green-bg)", "var(--color-green-deep)"]
        : stage.overdue > 0
          ? ["var(--color-red-bg)", "var(--color-red-deep)"]
          : stage.state === "current"
            ? ["var(--color-amber-bg)", "var(--color-amber-deep)"]
            : ["var(--color-surface-track)", "var(--color-ink-subtle)"];

  return (
    <Tip
      content={
        stage.applicable === 0 ? "No applicable activities in this stage." : (
          <span>
            <b>{stage.stage}</b><br />
            {stage.done}/{stage.applicable} resolved{stage.overdue ? ` · ${stage.overdue} overdue` : ""}
            {blockers.length > 0 && (
              <>
                <br /><br /><b>Missing:</b><br />
                {blockers.slice(0, 8).map((a) => (
                  <span key={a.id}>{a.code} {a.activityPlan.slice(0, 32)}{a.activityPlan.length > 32 ? "…" : ""}<br /></span>
                ))}
                {blockers.length > 8 && `+${blockers.length - 8} more`}
              </>
            )}
          </span>
        )
      }
    >
      <Link
        href={`/npd/tracker?product=${product.id}&stage=${encodeURIComponent(stage.stage)}` as Route}
        className="mx-auto flex h-10 w-full min-w-[58px] items-center justify-center gap-1 rounded-lg text-[12.5px] font-black transition hover:brightness-[0.97]"
        style={{ background: bg, color: fg }}
      >
        {stage.applicable === 0 ? "—" : stage.gateOpen ? "✓" : (
          <>{stage.overdue > 0 && <AlertTriangle size={11} />}{stage.done}/{stage.applicable}</>
        )}
      </Link>
    </Tip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  BOARD
// ═══════════════════════════════════════════════════════════════════════════

function BoardView({ products, onOpen }: { products: Product[]; onOpen: (p: Product) => void }) {
  const cols = NPD_STAGES.map((stage) => ({ stage, items: products.filter((p) => p.currentStage === stage) }));
  const done = products.filter((p) => p.currentStage === null);
  const maxWip = Math.max(1, ...cols.map((c) => c.items.length));

  return (
    <div className="kanban-scroll overflow-x-auto pb-3">
      <div className="flex gap-3" style={{ minWidth: 7 * 232 }}>
        {cols.map((c) => {
          const clogged = c.items.length === maxWip && maxWip > 1;
          return (
            <div key={c.stage} className="flex w-[232px] shrink-0 flex-col">
              <div className="mb-2 flex items-center justify-between rounded-xl border px-3 py-2 shadow-sm" style={{ background: clogged ? "var(--color-amber-bg)" : "#fff", borderColor: clogged ? "var(--color-amber)" : "var(--color-hairline-strong)" }}>
                <span className="text-[11px] font-black uppercase tracking-wide text-ink-strong">{STAGE_SHORT[c.stage]}</span>
                <Tip content={clogged ? "This is your bottleneck — more parts are stuck here than anywhere else." : `${c.items.length} part(s) in this stage`}>
                  <span className="rounded-full px-1.5 py-0.5 text-[11px] font-black" style={{ background: "var(--color-surface-track)", color: "var(--color-ink)" }}>{c.items.length}</span>
                </Tip>
              </div>
              <div className="flex flex-col gap-2">
                {c.items.map((p) => <BoardCard key={p.id} p={p} onOpen={onOpen} />)}
                {c.items.length === 0 && (
                  <div className="rounded-xl border border-dashed py-7 text-center text-[11px] text-ink-subtle" style={{ borderColor: "var(--color-hairline-strong)" }}>empty</div>
                )}
              </div>
            </div>
          );
        })}
        <div className="flex w-[232px] shrink-0 flex-col">
          <div className="mb-2 flex items-center justify-between rounded-xl border px-3 py-2 shadow-sm" style={{ background: "var(--color-green-bg)", borderColor: "var(--color-green)" }}>
            <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--color-green-deep)" }}>Handed over</span>
            <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-black" style={{ color: "var(--color-green-deep)" }}>{done.length}</span>
          </div>
          <div className="flex flex-col gap-2">{done.map((p) => <BoardCard key={p.id} p={p} onOpen={onOpen} />)}</div>
        </div>
      </div>
    </div>
  );
}

function BoardCard({ p, onOpen }: { p: Product; onOpen: (p: Product) => void }) {
  const m = HEALTH_META[p.health];
  const blocking = p.gateBlockers.filter((a) => a.state === "Overdue").length;
  return (
    <button
      onClick={() => onOpen(p)}
      className="premium-card rounded-xl border bg-white p-3 text-left transition-transform hover:-translate-y-0.5"
      style={{ borderColor: "var(--color-hairline-strong)", borderLeft: `3px solid ${m.color}` }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className="truncate text-[13px] font-extrabold text-ink-strong">{p.partName}</span>
        <HealthDot product={p} />
      </div>
      <div className="mt-0.5 truncate text-[11px] text-ink-subtle">{p.customer ?? "—"} · #{p.srNo ?? "—"}</div>
      <div className="mt-2.5"><MicroGrid product={p} cell={6} /></div>
      <div className="mt-2.5"><ProgressBar pct={p.pct} overdue={p.overdue} /></div>
      {blocking > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black" style={{ background: "var(--color-red-bg)", color: "var(--color-red-deep)" }}>
          <Lock size={10} /> {blocking} blocking this gate
        </div>
      )}
      {p.nextUp && <div className="mt-1.5 truncate text-[11px] text-ink-subtle">Next <b className="text-ink-strong">{p.nextUp.code}</b> · {fmtDate(p.nextUp.plannedDate)}</div>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Shared chrome
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({
  label, value, icon, from, to, onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  from: string;
  to: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</span>
        <span className="inline-flex size-7 items-center justify-center rounded-lg text-white shadow" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>{icon}</span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className="tabular-nums text-slate-900" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(24px,2.4vw,32px)", letterSpacing: "-0.025em", lineHeight: 1 }}>{value}</span>
        <span className="flex items-center gap-0.5 text-[11px] font-bold text-ink-subtle opacity-0 transition group-hover:opacity-100">view <ChevronRight size={12} /></span>
      </div>
    </button>
  );
}

function LiveTag() {
  return (
    <Tip content="This page refreshes on its own — anything you or the team change (here or in the Google Sheet) shows up automatically. No refresh button needed.">
      <span className="inline-flex h-10 cursor-default items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-ink-subtle shadow-sm">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-70" style={{ background: "var(--color-green)" }} />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: "var(--color-green-deep)" }} />
        </span>
        Live
      </span>
    </Tip>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="premium-card overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--color-hairline-strong)" }}>{children}</div>;
}

function Th({ children, className = "", hint }: { children?: React.ReactNode; className?: string; hint?: string }) {
  const inner = hint ? <Tip content={hint}><span className="cursor-help border-b border-dotted border-current">{children}</span></Tip> : children;
  return <th className={`px-2.5 py-2.5 text-left text-[10.5px] font-black uppercase tracking-[0.06em] text-ink-subtle ${className}`}>{inner}</th>;
}
function Td({ children, className = "", onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return <td className={`px-2.5 py-2.5 align-middle ${className}`} onClick={onClick}>{children}</td>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed bg-white p-14 text-center text-[13px] text-ink-subtle" style={{ borderColor: "var(--color-hairline-strong)" }}>{children}</div>;
}

function exportCsv(products: Product[]) {
  const head = ["Sr No", "Part Name", "Part No", "Customer", "Status", "Health", "Why", "Current Stage", "Applicable", "Done", "Open", "Overdue", "On Hold", "Progress %", "Slip (workdays)", "Start", "Baseline End", "Target End", "Forecast End", "Variance vs baseline"];
  const rows = products.map((p) => [
    p.srNo ?? "", p.partName, p.partNo ?? "", p.customer ?? "", p.status, p.health, p.healthReason,
    p.currentStage ?? "Complete", p.applicable, p.done, p.open, p.overdue, p.onHold, p.pct,
    p.slipDays, p.startDate ?? "", p.baselineEndDate ?? "", p.targetEndDate ?? "", p.forecastEnd ?? "", p.varianceDays,
  ]);
  const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ehara-npd-products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
