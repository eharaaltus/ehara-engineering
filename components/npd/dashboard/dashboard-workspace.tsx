"use client";

/**
 * NPD Dashboard — "maximum detail, shown simply".
 *
 * One scope selector at the top switches the whole screen between the cuts an
 * NPD lead actually asks for: the full portfolio, one customer, one product, or
 * one person. Every panel below reads the SAME computed model the Products page
 * uses (via lib/npd/insights), so the dashboard can never quietly disagree with
 * the list it summarises.
 *
 * Charts are deliberately calm: token-coloured bars and tight lists rather than
 * a wall of pie charts. Every number is clickable-adjacent to the work behind it.
 */

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  BarChart3, Boxes, Users, Factory, Building2, Flame, AlertTriangle, Lock, UserX,
  FileWarning, Clock, TrendingUp, ChevronRight,
} from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { STAGE_SHORT, fmtDate } from "@/lib/npd/status";
import { HEALTH_META, type Health, type Product } from "@/lib/npd/model";
import {
  computeKpis, healthMix, stageDistribution, overdueActivities, upcomingActivities,
  doerWorkload, customerBreakdown, delayReasons, stageCycle, type ActivityRef,
} from "@/lib/npd/insights";
import { HealthDot, ProgressBar, StageChevrons, MicroGrid, AutoRefresh, Tip, TooltipRoot } from "@/components/npd/bits";
import { Combobox } from "@/components/npd/combobox";

type Emp = { id: string; name: string };
type Scope = "all" | "customer" | "product" | "person";

const SCOPES: { id: Scope; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All products", icon: <Boxes size={15} /> },
  { id: "customer", label: "By customer", icon: <Building2 size={15} /> },
  { id: "product", label: "One product", icon: <Factory size={15} /> },
  { id: "person", label: "By person", icon: <Users size={15} /> },
];

export function DashboardWorkspace({ products, employees }: { products: Product[]; employees: Emp[] }) {
  const live = React.useMemo(() => products.filter((p) => !p.archived), [products]);
  const [scope, setScope] = React.useState<Scope>("all");
  const [customer, setCustomer] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [person, setPerson] = React.useState("");

  const customers = React.useMemo(
    () => [...new Set(live.map((p) => p.customer).filter(Boolean) as string[])].sort(),
    [live],
  );
  const doerNames = React.useMemo(() => {
    const s = new Set<string>();
    for (const p of live) for (const a of p.activities) if (a.doerName) s.add(a.doerName);
    return [...s].sort();
  }, [live]);

  const selectedProduct = live.find((p) => p.id === productId) ?? null;

  return (
    <TooltipRoot>
      <AutoRefresh />
      <PageHero
        eyebrow="New Product Development"
        title="Dashboard"
        subtitle="Everything on one screen — switch the scope to see the whole portfolio, one customer, one product, or one person."
        Icon={BarChart3}
        actions={
          <Link
            href={"/npd" as Route}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-extrabold text-ink-strong shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
          >
            <Boxes size={16} strokeWidth={2.5} /> Products
          </Link>
        }
      />

      {/* Scope selector */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {SCOPES.map((s) => {
            const on = scope === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-extrabold transition-all"
                style={on ? { background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)", color: "#fff", boxShadow: "0 10px 22px -12px rgba(30,64,175,0.65)" } : { color: "var(--color-ink-subtle)" }}
              >
                {s.icon} {s.label}
              </button>
            );
          })}
        </div>
        {scope === "customer" && (
          <Combobox value={customer} onChange={setCustomer} options={customers.map((c) => ({ value: c, label: c }))} placeholder="Choose a customer…" searchPlaceholder="Search customer…" widthClass="min-w-[220px]" />
        )}
        {scope === "product" && (
          <Combobox value={productId} onChange={setProductId} options={live.map((p) => ({ value: p.id, label: `#${p.srNo ?? "—"} ${p.partName}`, hint: p.customer ?? undefined }))} placeholder="Choose a product…" searchPlaceholder="Search product…" widthClass="min-w-[260px]" />
        )}
        {scope === "person" && (
          <Combobox value={person} onChange={setPerson} options={doerNames.map((d) => ({ value: d, label: d }))} placeholder="Choose a person…" searchPlaceholder="Search person…" widthClass="min-w-[220px]" />
        )}
      </div>

      <div className="mt-5">
        {scope === "product" ? (
          selectedProduct ? <ProductDeepDive product={selectedProduct} /> : <Prompt>Choose a product above to see its full story.</Prompt>
        ) : scope === "person" ? (
          person ? <PersonView products={live} person={person} /> : <Prompt>Choose a person above to see their workload.</Prompt>
        ) : scope === "customer" ? (
          customer ? <Portfolio products={live.filter((p) => p.customer === customer)} label={customer} /> : <Prompt>Choose a customer above.</Prompt>
        ) : (
          <Portfolio products={live} label="All products" showCustomers />
        )}
      </div>
    </TooltipRoot>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PORTFOLIO  (all products / one customer / a selection)
// ═══════════════════════════════════════════════════════════════════════════

function Portfolio({ products, label, showCustomers = false }: { products: Product[]; label: string; showCustomers?: boolean }) {
  const k = computeKpis(products);
  const mix = healthMix(products);
  const { bars, bottleneck } = stageDistribution(products);
  const overdue = overdueActivities(products);
  const upcoming = upcomingActivities(products, 14);
  const loads = doerWorkload(products);
  const reasons = delayReasons(products);
  const customers = customerBreakdown(products);

  if (!products.length) return <Prompt>No products in “{label}”.</Prompt>;

  const maxWip = Math.max(1, ...bars.map((b) => b.wip + b.done));
  const maxLoad = Math.max(1, ...loads.map((l) => l.total));
  const maxReason = Math.max(1, ...reasons.map((r) => r.count));

  return (
    <div className="space-y-5">
      {/* KPI band */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Active parts" value={k.activeParts} icon={<Boxes size={14} />} />
        <Kpi label="At risk" value={k.atRisk} tone={k.atRisk ? "red" : "ok"} icon={<Flame size={14} />} />
        <Kpi label="Overdue acts" value={k.overdueActivities} tone={k.overdueActivities ? "red" : "ok"} icon={<AlertTriangle size={14} />} />
        <Kpi label="Gate-blocked" value={k.gateBlocked} tone={k.gateBlocked ? "amber" : "ok"} icon={<Lock size={14} />} />
        <Kpi label="Unassigned" value={k.unassigned} tone={k.unassigned ? "amber" : "ok"} icon={<UserX size={14} />} />
        <Kpi label="Avg progress" value={`${k.avgProgress}%`} icon={<TrendingUp size={14} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Health mix */}
        <Card title="Portfolio health" hint="How every product sits right now.">
          <div className="space-y-2.5">
            {mix.map((m) => (
              <div key={m.health} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[12px] font-bold" style={{ color: HEALTH_META[m.health].color }}>{HEALTH_META[m.health].label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-surface-track)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(m.count / (products.length || 1)) * 100}%`, background: HEALTH_META[m.health].color }} />
                </div>
                <span className="w-6 text-right text-[13px] font-black tabular-nums text-ink-strong">{m.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Stage funnel */}
        <Card title="Pipeline by stage" hint="How many products sit in each stage now (WIP) vs have passed it. The bottleneck is where work piles up." className="lg:col-span-2">
          <div className="space-y-2">
            {bars.map((b) => (
              <div key={b.stage} className="flex items-center gap-3">
                <span className="flex w-24 shrink-0 items-center gap-1 text-[12px] font-bold text-ink-strong">
                  {b.short}
                  {bottleneck === b.stage && <Tip content="Bottleneck — most products are stuck here."><span className="rounded bg-[var(--color-amber-bg)] px-1 text-[9px] font-black text-[var(--color-amber-deep)]">SLOW</span></Tip>}
                </span>
                <div className="flex h-5 flex-1 overflow-hidden rounded-md" style={{ background: "var(--color-surface-track)" }}>
                  <Tip content={`${b.done} passed this stage`}>
                    <div className="h-full" style={{ width: `${(b.done / maxWip) * 100}%`, background: "var(--color-green)" }} />
                  </Tip>
                  <Tip content={`${b.wip} currently in ${b.stage}${b.overdueActs ? ` · ${b.overdueActs} overdue activities` : ""}`}>
                    <div className="h-full" style={{ width: `${(b.wip / maxWip) * 100}%`, background: b.overdueActs ? "var(--color-red)" : "var(--color-brand-blue)" }} />
                  </Tip>
                </div>
                <span className="w-8 text-right text-[12px] font-black tabular-nums text-ink-strong">{b.wip}</span>
              </div>
            ))}
            <Legend items={[["var(--color-green)", "passed"], ["var(--color-brand-blue)", "in stage"], ["var(--color-red)", "in stage + overdue"]]} />
          </div>
        </Card>
      </div>

      {/* Overdue + upcoming */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`Overdue activities (${overdue.length})`} hint="Past their planned date, worst first." tone={overdue.length ? "red" : undefined}>
          <ActivityList rows={overdue.slice(0, 12)} empty="Nothing overdue. 🎉" more={overdue.length - 12} />
        </Card>
        <Card title="Due in the next 14 days" hint="Working days, soonest first." icon={<Clock size={14} />}>
          <ActivityList rows={upcoming.slice(0, 12)} empty="Nothing due in the next two weeks." more={upcoming.length - 12} />
        </Card>
      </div>

      {/* Workload + reasons */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Workload by person" hint="Open activities per doer — overdue, due this week, and later.">
          {loads.length === 0 ? <Empty>No open work.</Empty> : (
            <div className="space-y-2">
              {loads.map((l) => (
                <div key={l.doerName} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-[12px] font-bold text-ink-strong">{l.doerName}</span>
                  <div className="flex h-5 flex-1 overflow-hidden rounded-md" style={{ background: "var(--color-surface-track)" }}>
                    <Tip content={`${l.overdue} overdue`}><div className="h-full" style={{ width: `${(l.overdue / maxLoad) * 100}%`, background: "var(--color-red)" }} /></Tip>
                    <Tip content={`${l.dueSoon} due this week`}><div className="h-full" style={{ width: `${(l.dueSoon / maxLoad) * 100}%`, background: "var(--color-amber)" }} /></Tip>
                    <Tip content={`${l.later} later`}><div className="h-full" style={{ width: `${(l.later / maxLoad) * 100}%`, background: "var(--color-brand-blue)" }} /></Tip>
                  </div>
                  <span className="w-7 text-right text-[12px] font-black tabular-nums text-ink-strong">{l.total}</span>
                </div>
              ))}
              <Legend items={[["var(--color-red)", "overdue"], ["var(--color-amber)", "this week"], ["var(--color-brand-blue)", "later"]]} />
            </div>
          )}
        </Card>

        <Card title="Why we slip" hint="Every reason captured when a date was pushed — the dataset a spreadsheet never keeps.">
          {reasons.length === 0 ? <Empty>No delay reasons recorded yet. They accumulate as dates are shifted with a reason.</Empty> : (
            <div className="space-y-1.5">
              {reasons.slice(0, 8).map((r) => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-strong" title={r.reason}>{r.reason}</span>
                  <div className="h-2.5 w-28 shrink-0 overflow-hidden rounded-full" style={{ background: "var(--color-surface-track)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(r.count / maxReason) * 100}%`, background: "var(--color-amber-deep)" }} />
                  </div>
                  <span className="w-5 text-right text-[12px] font-black tabular-nums text-ink-strong">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Customers (all-scope only) */}
      {showCustomers && customers.length > 1 && (
        <Card title="By customer" hint="Portfolio split by customer — at-risk first.">
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr style={{ background: "var(--color-surface-soft)" }}>
                  <Th>Customer</Th><Th className="text-center">Parts</Th><Th className="text-center">At risk</Th><Th className="text-center">Overdue acts</Th><Th className="w-[160px]">Avg progress</Th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customer} className="border-t" style={{ borderColor: "var(--color-hairline)" }}>
                    <Td className="font-bold text-ink-strong">{c.customer}</Td>
                    <Td className="text-center tabular-nums">{c.products}</Td>
                    <Td className="text-center"><Pill n={c.atRisk} tone={c.atRisk ? "red" : "ok"} /></Td>
                    <Td className="text-center"><Pill n={c.overdue} tone={c.overdue ? "red" : "ok"} /></Td>
                    <Td><ProgressBar pct={c.avgProgress} overdue={c.overdue} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SINGLE PRODUCT DEEP-DIVE
// ═══════════════════════════════════════════════════════════════════════════

function ProductDeepDive({ product }: { product: Product }) {
  const cycle = stageCycle(product);
  const overdue = product.activities.filter((a) => a.state === "Overdue").sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const upcoming = product.activities.filter((a) => a.isOpen && a.daysLeft !== null && a.daysLeft >= 0).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)).slice(0, 10);
  const late = product.varianceDays > 0;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md px-1.5 py-0.5 text-[11px] font-black" style={{ background: "var(--color-blue-bg)", color: "var(--color-brand-blue)" }}>#{product.srNo ?? "—"}</span>
              <HealthDot product={product} showLabel />
            </div>
            <h2 className="mt-1 text-[20px] font-black text-ink-strong">{product.partName}</h2>
            <p className="text-[13px] text-ink-subtle">{product.customer ?? "—"}{product.partNo ? ` · ${product.partNo}` : ""}</p>
            <div className="mt-3"><StageChevrons product={product} /></div>
          </div>
          <MicroGrid product={product} cell={12} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Progress" value={`${product.pct}%`} />
          <Kpi label="Done" value={`${product.done}/${product.applicable}`} tone="ok" />
          <Kpi label="Overdue" value={product.overdue} tone={product.overdue ? "red" : "ok"} />
          <Kpi label="Slip" value={product.slipDays ? `${product.slipDays}d` : "—"} tone={product.slipDays ? "amber" : "ok"} />
          <Kpi label="Target" value={fmtDate(product.targetEndDate)} small />
          <Kpi label="Forecast" value={fmtDate(product.forecastEnd)} tone={late ? "red" : "ok"} small suffix={late ? `+${product.varianceDays}d` : undefined} />
        </div>
      </Card>

      <Card title="Stage completion" hint="Applicable-only. A gate opens only at 100%.">
        <div className="space-y-2">
          {cycle.map((c) => (
            <div key={c.stage} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[12px] font-bold text-ink-strong">{c.short}</span>
              <div className="flex-1"><ProgressBar pct={c.pct} overdue={c.overdue} /></div>
              <span className="w-12 text-right text-[11px] font-bold text-ink-subtle">{c.done}/{c.applicable}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`Overdue (${overdue.length})`} tone={overdue.length ? "red" : undefined}>
          <ActivityList rows={overdue.map(refFrom(product))} empty="Nothing overdue on this product." />
        </Card>
        <Card title="Coming up">
          <ActivityList rows={upcoming.map(refFrom(product))} empty="Nothing scheduled ahead." />
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PERSON
// ═══════════════════════════════════════════════════════════════════════════

function PersonView({ products, person }: { products: Product[]; person: string }) {
  const mine = products.flatMap((p) => p.activities).filter((a) => a.doerName === person);
  const open = mine.filter((a) => a.isOpen);
  const overdue = open.filter((a) => a.state === "Overdue").sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const dueSoon = open.filter((a) => a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= 7).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const later = open.filter((a) => a.state !== "Overdue" && (a.daysLeft === null || a.daysLeft > 7));

  const byProduct = new Map<string, number>();
  for (const a of open) byProduct.set(a.productPartName, (byProduct.get(a.productPartName) ?? 0) + 1);
  const productRows = [...byProduct.entries()].sort((a, b) => b[1] - a[1]);

  const toRef = (a: (typeof mine)[number]): ActivityRef => ({
    id: a.id, code: a.code, activityPlan: a.activityPlan, productId: a.productId,
    productName: a.productPartName, productSrNo: a.productSrNo, customer: a.productCustomer,
    doerName: a.doerName, plannedDate: a.plannedDate, daysLeft: a.daysLeft, state: a.state, stage: a.stage as never,
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open tasks" value={open.length} icon={<Boxes size={14} />} />
        <Kpi label="Overdue" value={overdue.length} tone={overdue.length ? "red" : "ok"} icon={<AlertTriangle size={14} />} />
        <Kpi label="Due this week" value={dueSoon.length} tone={dueSoon.length ? "amber" : "ok"} icon={<Clock size={14} />} />
        <Kpi label="Across products" value={productRows.length} icon={<Factory size={14} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`${person} — overdue (${overdue.length})`} tone={overdue.length ? "red" : undefined}>
          <ActivityList rows={overdue.map(toRef)} empty="Nothing overdue. Nice." showProduct />
        </Card>
        <Card title="Due this week">
          <ActivityList rows={dueSoon.map(toRef)} empty="Nothing due this week." showProduct />
        </Card>
      </div>

      <Card title="Spread across products" hint="Where this person's open work sits.">
        {productRows.length === 0 ? <Empty>No open work.</Empty> : (
          <div className="space-y-1.5">
            {productRows.map(([name, n]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-strong">{name}</span>
                <span className="rounded-full bg-[var(--color-surface-track)] px-2 py-0.5 text-[11px] font-black text-ink-strong">{n}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p className="text-[12px] text-ink-subtle">Later ({later.length}) not shown — focus is on what’s overdue and due this week.</p>
    </div>
  );
}

function refFrom(product: Product) {
  return (a: Product["activities"][number]): ActivityRef => ({
    id: a.id, code: a.code, activityPlan: a.activityPlan, productId: product.id,
    productName: product.partName, productSrNo: product.srNo, customer: product.customer,
    doerName: a.doerName, plannedDate: a.plannedDate, daysLeft: a.daysLeft, state: a.state, stage: a.stage as never,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  Shared bits
// ═══════════════════════════════════════════════════════════════════════════

function ActivityList({ rows, empty, more = 0, showProduct = false }: { rows: ActivityRef[]; empty: string; more?: number; showProduct?: boolean }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="space-y-1">
      {rows.map((a) => {
        const overdue = a.state === "Overdue";
        return (
          <Link key={a.id} href={`/npd/${a.productId}` as Route} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--color-surface-soft)]">
            <span className="rounded px-1 py-0.5 text-[10px] font-black" style={{ background: "var(--color-surface-track)", color: "var(--color-ink)" }}>{a.code}</span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink-strong">
              {a.activityPlan}
              {showProduct && <span className="ml-1 text-ink-subtle">· {a.productName}</span>}
            </span>
            {a.doerName && !showProduct && <span className="hidden shrink-0 text-[11px] text-ink-subtle sm:inline">{a.doerName}</span>}
            <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums" style={{ background: overdue ? "var(--color-red-bg)" : "var(--color-surface-track)", color: overdue ? "var(--color-red-deep)" : "var(--color-ink-subtle)" }}>
              {a.daysLeft !== null ? (overdue ? `${a.daysLeft}d` : `${a.daysLeft}d left`) : fmtDate(a.plannedDate)}
            </span>
          </Link>
        );
      })}
      {more > 0 && <div className="px-2 pt-1 text-[11px] font-semibold text-ink-subtle">+{more} more</div>}
    </div>
  );
}

function Card({ title, hint, children, className = "", tone, icon }: { title?: string; hint?: string; children: React.ReactNode; className?: string; tone?: "red"; icon?: React.ReactNode }) {
  return (
    <div className={`premium-card rounded-2xl border bg-white p-4 ${className}`} style={{ borderColor: tone === "red" ? "var(--color-red)" : "var(--color-hairline-strong)" }}>
      {title && (
        <div className="mb-3 flex items-center gap-1.5">
          {icon && <span className="text-ink-subtle">{icon}</span>}
          <h3 className="text-[13px] font-black uppercase tracking-wide text-ink-strong">{title}</h3>
          {hint && <Tip content={hint}><span className="cursor-help text-[11px] text-ink-subtle">ⓘ</span></Tip>}
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ label, value, tone = "ok", icon, small, suffix }: { label: string; value: React.ReactNode; tone?: "ok" | "red" | "amber"; icon?: React.ReactNode; small?: boolean; suffix?: string }) {
  const color = tone === "red" ? "var(--color-red-deep)" : tone === "amber" ? "var(--color-amber-deep)" : "var(--color-ink)";
  return (
    <div className="rounded-xl border bg-white px-3 py-2.5 shadow-sm" style={{ borderColor: "var(--color-hairline-strong)" }}>
      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-ink-subtle">{icon}<span className="truncate">{label}</span></div>
      <div className={`mt-0.5 font-black leading-none tabular-nums ${small ? "text-[15px]" : "text-[22px]"}`} style={{ color }}>
        {value}{suffix && <span className="ml-1 text-[11px]">{suffix}</span>}
      </div>
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10.5px] font-semibold text-ink-subtle">
      {items.map(([c, l]) => <span key={l} className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
    </div>
  );
}

function Pill({ n, tone }: { n: number; tone: "red" | "ok" }) {
  if (!n) return <span className="text-ink-subtle">—</span>;
  return <span className="inline-flex min-w-[22px] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-black" style={{ background: tone === "red" ? "var(--color-red-bg)" : "var(--color-surface-track)", color: tone === "red" ? "var(--color-red-deep)" : "var(--color-ink)" }}>{n}</span>;
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed bg-white p-14 text-center text-[13px] font-semibold text-ink-subtle" style={{ borderColor: "var(--color-hairline-strong)" }}>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-[12.5px] text-ink-subtle">{children}</div>;
}
function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-2.5 py-2 text-left text-[10.5px] font-black uppercase tracking-[0.06em] text-ink-subtle ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-2.5 py-2 align-middle ${className}`}>{children}</td>;
}
