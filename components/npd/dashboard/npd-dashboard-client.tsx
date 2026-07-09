"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { X, ArrowUpRight, Check, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Donut } from "@/components/charts/donut";
import { MultiSelect } from "@/components/ui/multi-select";
import { fmtDate, addDaysISO, computeHealth, NPD_STAGES, STAGE_SHORT } from "@/lib/npd/status";
import { computePortfolio, enrichActivities, type NpdPortfolio, type EnrichedActivity, type NpdProductLite, type NpdTaskLite } from "@/lib/npd/dashboard";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "delays", label: "Delays" },
  { key: "departments", label: "Departments" },
  { key: "efficiency", label: "Efficiency" },
  { key: "products", label: "Products" },
  { key: "customers", label: "Customers" },
  { key: "timeline", label: "Timeline" },
  { key: "schedule", label: "Schedule" },
] as const;

// Status filter value → which computed states it includes.
const STATUS_STATES: Record<string, string[]> = {
  Overdue: ["Overdue"],
  Pending: ["OnTrack", "DueToday"],
  Done: ["Done"],
  "On Hold": ["OnHold"],
  "N/A": ["NotApplicable"],
};
type TabKey = (typeof TABS)[number]["key"];

const HEALTH_COLOR = { Good: "#16a34a", "At Risk": "#d97706", Critical: "#e11d2f" } as const;
const RISK_COLOR = { Critical: "#e11d2f", "At Risk": "#d97706", Clear: "#16a34a" } as const;
const STATE_COLOR: Record<string, string> = {
  Done: "#16a34a", Overdue: "#e11d2f", OnHold: "#94a3b8", DueToday: "#d97706", OnTrack: "#1e40af", NotApplicable: "#cbd5e1",
};

interface Drill { title: string; subtitle?: string; rows: EnrichedActivity[]; }

export function NpdDashboardClient({ products, tasks }: { products: NpdProductLite[]; tasks: NpdTaskLite[] }) {
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [drill, setDrill] = React.useState<Drill | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(products.map((p) => p.id)));
  // Filters
  const [fCustomer, setFCustomer] = React.useState<string[]>([]);
  const [fDoer, setFDoer] = React.useState<string[]>([]);
  const [fStage, setFStage] = React.useState<string[]>([]);
  const [fStatus, setFStatus] = React.useState<string[]>([]);
  const [fHealth, setFHealth] = React.useState<string[]>([]);

  // Filter option lists (from the raw data).
  const customerOpts = React.useMemo(() => uniq(products.map((p) => p.customer)).map((v) => ({ value: v, label: v })), [products]);
  const doerOpts = React.useMemo(() => uniq(tasks.map((t) => t.doerName ?? "Unassigned")).map((v) => ({ value: v, label: v })), [tasks]);
  const stageOpts = NPD_STAGES.map((s) => ({ value: s, label: STAGE_SHORT[s] ?? s }));
  const statusOpts = ["Overdue", "Pending", "Done", "On Hold", "N/A"].map((v) => ({ value: v, label: v }));
  const healthOpts = ["Good", "At Risk", "Critical"].map((v) => ({ value: v, label: v }));

  // Base health per product (from ALL its tasks) — drives the Health filter.
  const healthById = React.useMemo(() => {
    const byP = new Map<string, NpdTaskLite[]>();
    for (const t of tasks) { const a = byP.get(t.productId) ?? []; a.push(t); byP.set(t.productId, a); }
    const m = new Map<string, string>();
    for (const pr of products) m.set(pr.id, computeHealth((byP.get(pr.id) ?? []).map((t) => ({ plannedDate: t.plannedDate, resolution: t.resolution, completionDate: t.completionDate, applicability: t.applicability }))).health);
    return m;
  }, [products, tasks]);
  // Enriched state per task key — drives the Status filter.
  const stateByKey = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of enrichActivities(products, tasks)) m.set(`${a.productId}::${a.code}`, a.state);
    return m;
  }, [products, tasks]);

  const filteredProducts = React.useMemo(() => products.filter((pr) =>
    selected.has(pr.id)
    && (fCustomer.length === 0 || (pr.customer != null && fCustomer.includes(pr.customer)))
    && (fHealth.length === 0 || fHealth.includes(healthById.get(pr.id) ?? "Good"))
  ), [products, selected, fCustomer, fHealth, healthById]);
  const fpIds = React.useMemo(() => new Set(filteredProducts.map((x) => x.id)), [filteredProducts]);
  const statusStates = React.useMemo(() => new Set(fStatus.flatMap((s) => STATUS_STATES[s] ?? [])), [fStatus]);
  const filteredTasks = React.useMemo(() => tasks.filter((t) =>
    fpIds.has(t.productId)
    && (fDoer.length === 0 || fDoer.includes(t.doerName ?? "Unassigned"))
    && (fStage.length === 0 || fStage.includes(t.stage))
    && (fStatus.length === 0 || statusStates.has(stateByKey.get(`${t.productId}::${t.code}`) ?? ""))
  ), [tasks, fpIds, fDoer, fStage, fStatus, statusStates, stateByKey]);

  const p = React.useMemo(() => computePortfolio(filteredProducts, filteredTasks), [filteredProducts, filteredTasks]);
  const acts = p.activities;

  const openDrill = (title: string, rows: EnrichedActivity[], subtitle?: string) => setDrill({ title, subtitle, rows });
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = selected.size === products.length;
  const filterCount = fCustomer.length + fDoer.length + fStage.length + fStatus.length + fHealth.length;
  const clearFilters = () => { setFCustomer([]); setFDoer([]); setFStage([]); setFStatus([]); setFHealth([]); };

  return (
    <div>
      {/* product toggles */}
      {products.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-card p-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Include:</span>
          {products.map((pr) => {
            const on = selected.has(pr.id);
            return (
              <button key={pr.id} onClick={() => toggle(pr.id)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors"
                style={on ? { background: "#1e40af", color: "#fff" } : { background: "var(--color-surface-track,#eef2f7)", color: "var(--color-ink-subtle)" }}>
                {on && <Check size={12} strokeWidth={3} />}#{pr.srNo ?? "?"} {pr.partName}
              </button>
            );
          })}
          <button onClick={() => setSelected(new Set(products.map((x) => x.id)))} disabled={allOn}
            className="ml-auto rounded-lg px-2 py-1 text-[12px] font-bold text-[#1e40af] disabled:opacity-40">All</button>
        </div>
      )}

      {/* filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-card p-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
          <SlidersHorizontal size={13} /> Filters
        </span>
        <MultiSelect options={customerOpts} selected={fCustomer} onChange={setFCustomer} placeholder="All Customers" className="min-w-[8rem] !text-[13px]" />
        <MultiSelect options={doerOpts} selected={fDoer} onChange={setFDoer} placeholder="All Doers" className="min-w-[7rem] !text-[13px]" />
        <MultiSelect options={stageOpts} selected={fStage} onChange={setFStage} placeholder="All Stages" className="min-w-[7rem] !text-[13px]" />
        <MultiSelect options={statusOpts} selected={fStatus} onChange={setFStatus} placeholder="Any Status" className="min-w-[7rem] !text-[13px]" />
        <MultiSelect options={healthOpts} selected={fHealth} onChange={setFHealth} placeholder="Any Health" className="min-w-[7rem] !text-[13px]" />
        {filterCount > 0 && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-bold text-ink-strong hover:border-[#e11d2f] hover:text-[#e11d2f]">
            <RotateCcw size={12} /> Clear ({filterCount})
          </button>
        )}
        <span className="ml-auto text-[12px] text-ink-subtle">{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} · {p.kpis.applicableActivities} activities</span>
      </div>

      {/* tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-hairline bg-surface-card p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="whitespace-nowrap rounded-lg px-4 py-2 text-[13.5px] font-bold transition-colors"
            style={tab === t.key ? { background: "#1e40af", color: "#fff" } : { color: "var(--color-ink-subtle)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview p={p} openDrill={openDrill} acts={acts} />}
      {tab === "delays" && <Delays p={p} openDrill={openDrill} acts={acts} />}
      {tab === "departments" && <Departments p={p} openDrill={openDrill} acts={acts} />}
      {tab === "efficiency" && <Efficiency p={p} openDrill={openDrill} acts={acts} />}
      {tab === "products" && <Products p={p} openDrill={openDrill} acts={acts} />}
      {tab === "customers" && <Customers p={p} openDrill={openDrill} acts={acts} />}
      {tab === "timeline" && <Timeline products={filteredProducts} acts={acts} openDrill={openDrill} />}
      {tab === "schedule" && <Schedule p={p} openDrill={openDrill} acts={acts} />}

      <DrillDrawer drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

/* ─────────────────────────── OVERVIEW ─────────────────────────── */
function Overview({ p, openDrill, acts }: ViewProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Overall completion">
          <Gauge value={p.kpis.avgPercentDone} />
          <div className="mt-1 text-center text-[12.5px] text-ink-subtle">
            {p.kpis.completedActivities}/{p.kpis.applicableActivities} activities done
          </div>
        </Card>
        <Card title="Activity status">
          <DonutBlock slices={p.stateDist} center={`${p.kpis.applicableActivities}`} centerLabel="activities"
            onSlice={(label) => openDrill(`Activities · ${label}`, acts.filter((a) => stateMatch(a, label)))} />
        </Card>
        <Card title="Product health">
          <DonutBlock slices={p.healthDist} center={`${p.kpis.totalProducts}`} centerLabel="products" />
        </Card>
      </div>
      <Card title="Activities by stage — click a bar to drill in">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={p.stageCompletion.map((s) => ({ stage: s.short, key: s.stage, Done: s.done, Overdue: s.overdue, Remaining: s.remaining }))} margin={{ top: 8, right: 8, bottom: 30, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-14} textAnchor="end" height={54} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(30,64,175,0.05)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Done" stackId="a" fill="#16a34a" cursor="pointer" onClick={(d: any) => openDrill(`${d.stage} · Done`, acts.filter((a) => a.stage === d.key && a.state === "Done"))} />
            <Bar dataKey="Overdue" stackId="a" fill="#e11d2f" cursor="pointer" onClick={(d: any) => openDrill(`${d.stage} · Overdue`, acts.filter((a) => a.stage === d.key && a.state === "Overdue"))} />
            <Bar dataKey="Remaining" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => openDrill(`${d.stage} · Remaining`, acts.filter((a) => a.stage === d.key && (a.state === "OnTrack" || a.state === "DueToday" || a.state === "OnHold")))} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Workload by doer">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={p.doerWorkload.map((d) => ({ doer: d.doer, Done: d.done, Overdue: d.overdue, Open: d.open }))} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
            <XAxis dataKey="doer" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(30,64,175,0.05)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Done" stackId="a" fill="#16a34a" cursor="pointer" onClick={(d: any) => openDrill(`${d.doer} · Done`, acts.filter((a) => (a.doerName ?? "Unassigned") === d.doer && a.state === "Done"))} />
            <Bar dataKey="Overdue" stackId="a" fill="#e11d2f" cursor="pointer" onClick={(d: any) => openDrill(`${d.doer} · Overdue`, acts.filter((a) => (a.doerName ?? "Unassigned") === d.doer && a.state === "Overdue"))} />
            <Bar dataKey="Open" stackId="a" fill="#1e40af" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => openDrill(`${d.doer} · Open`, acts.filter((a) => (a.doerName ?? "Unassigned") === d.doer && a.state !== "Done" && a.state !== "Overdue" && a.state !== "NotApplicable"))} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ─────────────────────────── DELAYS (D2) ─────────────────────────── */
function Delays({ p, openDrill, acts }: ViewProps) {
  const worst = [...acts].filter((a) => a.state === "Overdue").sort((a, b) => b.delayDays - a.delayDays).slice(0, 15);
  const topStage = p.stageBottleneck.find((s) => s.delayDays > 0);
  return (
    <div className="space-y-4">
      {topStage && (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[14px] font-semibold text-[#991b1b]">
          Key insight: <b>{topStage.short}</b> is the #1 bottleneck — {topStage.delayDays} delay-days across {topStage.overdue} overdue activities.
        </div>
      )}
      <Card title="Stage delay-days — click a bar to see the overdue activities">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={p.stageBottleneck.map((s) => ({ stage: s.short, key: s.stage, delay: s.delayDays, risk: s.risk }))} margin={{ top: 4, right: 24, bottom: 4, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#64748b" }} width={90} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(30,64,175,0.05)" }} formatter={(v: any) => [`${v} delay-days`, "Delay"]} />
            <Bar dataKey="delay" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openDrill(`${d.stage} · Overdue`, acts.filter((a) => a.stage === d.key && a.state === "Overdue"))}>
              {p.stageBottleneck.map((s, i) => <Cell key={i} fill={RISK_COLOR[s.risk]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title={`Top ${worst.length} delayed activities — root cause`}>
        <ActivityList rows={worst} showProduct onRow={(a) => openDrill(`${a.partName} · ${a.stageShort}`, acts.filter((x) => x.productId === a.productId && x.stage === a.stage))} />
      </Card>
    </div>
  );
}

/* ───────────────────── DEPARTMENTS (D3/D4) ─────────── */
function Departments({ p, openDrill, acts }: ViewProps) {
  const ds = p.delaySource;
  return (
    <div className="space-y-4">
      <Card title="Department (stage) workload — click a row">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead><tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-ink-subtle">
              <th className="py-2 pr-2 font-bold">Department</th><th className="py-2 pr-2 font-bold text-right">Done</th>
              <th className="py-2 pr-2 font-bold text-right">Pending</th><th className="py-2 pr-2 font-bold text-right">Overdue</th>
              <th className="py-2 pr-2 font-bold text-right">Delay-days</th><th className="py-2 font-bold">Risk</th>
            </tr></thead>
            <tbody>
              {p.stageBottleneck.map((s) => (
                <tr key={s.stage} className="cursor-pointer border-b border-hairline/50 last:border-0 hover:bg-[rgba(30,64,175,0.04)]"
                  onClick={() => openDrill(`${s.short} · all activities`, acts.filter((a) => a.stage === s.stage && a.state !== "NotApplicable"))}>
                  <td className="py-2.5 pr-2 font-semibold text-ink-strong">{s.short}</td>
                  <td className="py-2.5 pr-2 text-right font-bold text-[#16a34a]">{s.done}</td>
                  <td className="py-2.5 pr-2 text-right text-ink-muted">{s.pending}</td>
                  <td className="py-2.5 pr-2 text-right font-bold" style={{ color: s.overdue ? "#e11d2f" : "inherit" }}>{s.overdue}</td>
                  <td className="py-2.5 pr-2 text-right font-black" style={{ color: s.delayDays ? "#d97706" : "inherit" }}>{s.delayDays}</td>
                  <td className="py-2.5"><span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: RISK_COLOR[s.risk] }}>{s.risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Internal vs Customer delays">
          <div className="flex flex-wrap items-center justify-around gap-4 py-3">
            <ClickStat label="Internal overdue" value={ds.internal} sub={`${ds.internalDelayDays} delay-days`} color="#e11d2f" onClick={() => openDrill("Internal overdue activities", acts.filter((a) => a.state === "Overdue" && !a.customer))} />
            <ClickStat label="Customer overdue" value={ds.customer} sub={`${ds.customerDelayDays} delay-days`} color="#1e40af" onClick={() => openDrill("Customer-dependent overdue activities", acts.filter((a) => a.state === "Overdue" && a.customer))} />
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart layout="vertical" data={[{ name: "Delay-days", Internal: ds.internalDelayDays, Customer: ds.customerDelayDays }]} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="name" hide />
              <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Internal" stackId="a" fill="#e11d2f" radius={[4, 0, 0, 4]} />
              <Bar dataKey="Customer" stackId="a" fill="#1e40af" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Stage completion %">
          <div className="space-y-2.5 py-1">
            {p.stageCompletion.map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between text-[12.5px]"><span className="font-semibold text-ink-strong">{s.short}</span><span className="text-ink-subtle">{s.done}/{s.applicable} · {s.pctDone}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-surface-track,#e2e8f0)]"><div className="h-full rounded-full" style={{ width: `${s.pctDone}%`, background: s.overdue ? "#e11d2f" : "#16a34a" }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────── EFFICIENCY ─────────────────────────── */
function Efficiency({ p, openDrill, acts }: ViewProps) {
  const e = p.efficiency;
  const slices = [
    { label: "Early", value: e.early, color: "#16a34a" },
    { label: "On time", value: e.onTime, color: "#1e40af" },
    { label: "Late", value: e.late, color: "#e11d2f" },
  ];
  return (
    <div className="space-y-4">
      {e.scored === 0 ? (
        <Card><p className="py-12 text-center text-ink-subtle">No completed activities yet — efficiency appears once activities are marked done with a completion date.</p></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Completion efficiency (done activities)">
            <DonutBlock slices={slices} center={`${e.scored}`} centerLabel="completed"
              onSlice={(label) => {
                const cmp = label === "Early" ? (v: number) => v < 0 : label === "Late" ? (v: number) => v > 0 : (v: number) => v === 0;
                openDrill(`Completed · ${label}`, acts.filter((a) => a.state === "Done" && a.completionDate && a.plannedDate && cmp(daysBetween(a.plannedDate!, a.completionDate!))));
              }} />
          </Card>
          <Card title="At a glance">
            <div className="grid grid-cols-2 gap-3 py-2">
              <MiniStat label="On-time rate" value={`${Math.round(((e.early + e.onTime) / e.scored) * 100)}%`} color="#16a34a" />
              <MiniStat label="Late completions" value={e.late} color={e.late ? "#e11d2f" : undefined} />
              <MiniStat label="Avg variance" value={`${e.avgVarianceDays > 0 ? "+" : ""}${e.avgVarianceDays}d`} color={e.avgVarianceDays > 0 ? "#e11d2f" : "#16a34a"} />
              <MiniStat label="Scored" value={e.scored} />
            </div>
          </Card>
        </div>
      )}
      <Card title="Per-product completion">
        <div className="space-y-2.5">
          {p.perProduct.map((pp) => (
            <div key={pp.id} className="flex items-center gap-3">
              <span className="w-40 truncate text-[13px] font-semibold text-ink-strong">{pp.partName}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-track,#e2e8f0)]"><div className="h-full rounded-full" style={{ width: `${pp.percentDone}%`, background: HEALTH_COLOR[pp.health] }} /></div>
              <span className="w-24 text-right text-[12.5px] text-ink-subtle">{pp.done}/{pp.total} done</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────── PRODUCTS (D5) ─────────────────────────── */
function Products({ p, openDrill, acts }: ViewProps) {
  return (
    <Card title="All products — side by side">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead><tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-ink-subtle">
            <th className="py-2 pr-2 font-bold">Product</th><th className="py-2 pr-2 font-bold">Customer</th>
            <th className="py-2 pr-2 font-bold text-right">%</th><th className="py-2 pr-2 font-bold text-right">Done</th>
            <th className="py-2 pr-2 font-bold text-right">Overdue</th><th className="py-2 pr-2 font-bold text-right">Hold</th>
            <th className="py-2 pr-2 font-bold text-right">Pending</th><th className="py-2 pr-2 font-bold text-right">Delay-days</th>
            <th className="py-2 pr-2 font-bold">Bottleneck</th><th className="py-2 pr-2 font-bold">Predicted</th><th className="py-2 font-bold">Risk</th>
          </tr></thead>
          <tbody>
            {p.perProduct.map((pp) => (
              <tr key={pp.id} className="cursor-pointer border-b border-hairline/50 last:border-0 hover:bg-[rgba(30,64,175,0.04)]"
                onClick={() => openDrill(pp.partName, acts.filter((a) => a.productId === pp.id && a.state !== "NotApplicable"), pp.customer ?? undefined)}>
                <td className="py-2.5 pr-2 font-semibold text-ink-strong">{pp.partName}</td>
                <td className="py-2.5 pr-2 text-ink-muted">{pp.customer ?? "—"}</td>
                <td className="py-2.5 pr-2 text-right font-black text-ink-strong">{pp.percentDone}%</td>
                <td className="py-2.5 pr-2 text-right font-bold text-[#16a34a]">{pp.done}</td>
                <td className="py-2.5 pr-2 text-right font-bold" style={{ color: pp.overdue ? "#e11d2f" : "inherit" }}>{pp.overdue}</td>
                <td className="py-2.5 pr-2 text-right text-ink-muted">{pp.onHold}</td>
                <td className="py-2.5 pr-2 text-right text-ink-muted">{pp.pending}</td>
                <td className="py-2.5 pr-2 text-right font-black" style={{ color: pp.delayDays ? "#d97706" : "inherit" }}>{pp.delayDays}</td>
                <td className="py-2.5 pr-2 text-ink-muted">{pp.bottleneckStage ?? "—"}</td>
                <td className="py-2.5 pr-2" style={{ color: pp.predictedEnd && pp.targetEndDate && pp.predictedEnd > pp.targetEndDate ? "#e11d2f" : "#16a34a" }}>{fmtDate(pp.predictedEnd)}</td>
                <td className="py-2.5"><span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: HEALTH_COLOR[pp.health] }}>{pp.health}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ─────────────────────────── CUSTOMERS ─────────────────────────── */
function Customers({ p, openDrill, acts }: ViewProps) {
  const rows = p.customerBreakdown;
  if (rows.length === 0) return <Card><p className="py-10 text-center text-ink-subtle">No customers to show.</p></Card>;
  const max = Math.max(1, ...rows.map((r) => r.delayDays));
  return (
    <div className="space-y-4">
      <Card title="Delay-days by customer">
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 46)}>
          <BarChart layout="vertical" data={rows.map((r) => ({ name: r.customer, delay: r.delayDays }))} margin={{ top: 4, right: 24, bottom: 4, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={110} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(30,64,175,0.05)" }} formatter={(v: any) => [`${v} delay-days`, "Delay"]} />
            <Bar dataKey="delay" radius={[0, 4, 4, 0]} cursor="pointer"
              onClick={(d: any) => openDrill(`${d.name} · overdue`, acts.filter((a) => a.state === "Overdue" && a.partName && p.perProduct.some((pp) => pp.customer === d.name && pp.id === a.productId)))}>
              {rows.map((_, i) => <Cell key={i} fill={i === 0 ? "#e11d2f" : "#1e40af"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Per-customer summary">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead><tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-ink-subtle">
              <th className="py-2 pr-2 font-bold">Customer</th><th className="py-2 pr-2 font-bold text-right">Products</th>
              <th className="py-2 pr-2 font-bold text-right">Activities</th><th className="py-2 pr-2 font-bold text-right">Done</th>
              <th className="py-2 pr-2 font-bold text-right">Overdue</th><th className="py-2 pr-2 font-bold text-right">Delay-days</th>
              <th className="py-2 pr-2 font-bold text-right">%</th><th className="py-2 font-bold">Progress</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customer} className="border-b border-hairline/50 last:border-0">
                  <td className="py-2.5 pr-2 font-semibold text-ink-strong">{r.customer}</td>
                  <td className="py-2.5 pr-2 text-right text-ink-muted">{r.products}</td>
                  <td className="py-2.5 pr-2 text-right text-ink-muted">{r.applicable}</td>
                  <td className="py-2.5 pr-2 text-right font-bold text-[#16a34a]">{r.done}</td>
                  <td className="py-2.5 pr-2 text-right font-bold" style={{ color: r.overdue ? "#e11d2f" : "inherit" }}>{r.overdue}</td>
                  <td className="py-2.5 pr-2 text-right font-black" style={{ color: r.delayDays ? "#d97706" : "inherit" }}>{r.delayDays}</td>
                  <td className="py-2.5 pr-2 text-right font-black text-ink-strong">{r.pctDone}%</td>
                  <td className="py-2.5 w-40"><div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-track,#e2e8f0)]"><div className="h-full rounded-full" style={{ width: `${r.pctDone}%`, background: r.overdue ? "#e11d2f" : "#16a34a" }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────── TIMELINE (Gantt) ─────────────────────────── */
function Timeline({ products, acts, openDrill }: { products: NpdProductLite[]; acts: EnrichedActivity[]; openDrill: ViewProps["openDrill"] }) {
  const dated = acts.filter((a) => a.plannedDate);
  if (dated.length === 0) return <Card><p className="py-12 text-center text-ink-subtle">No planned dates yet.</p></Card>;
  const dates = dated.map((a) => a.plannedDate!).sort();
  const today = new Date().toISOString().slice(0, 10);
  const min = dates[0]! < today ? dates[0]! : today;
  const max = dates[dates.length - 1]! > today ? dates[dates.length - 1]! : today;
  const span = Math.max(1, daysBetween(min, max));
  const pos = (iso: string) => Math.min(100, Math.max(0, (daysBetween(min, iso) / span) * 100));
  const STAGES = ["TECHNICAL", "COMMERCIAL", "TOOL DEVELOPMENT", "PART SUBMISSION", "PPAP & PTR DOCUMENT", "PRE PRODUCTION HANDOVER"];
  const STAGE_FILL = ["#1e40af", "#0ea5c4", "#7c3aed", "#d97706", "#db2777", "#16a34a"];
  const months = monthTicks(min, max);

  return (
    <Card title="Timeline — planned schedule per product (click a stage bar)">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* month axis */}
          <div className="relative mb-1 ml-40 h-5 border-b border-hairline">
            {months.map((m) => (
              <span key={m.iso} className="absolute -translate-x-1/2 text-[10px] font-semibold text-ink-subtle" style={{ left: `${pos(m.iso)}%` }}>{m.label}</span>
            ))}
          </div>
          {/* today line */}
          <div className="relative">
            <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[#e11d2f]" style={{ left: `calc(10rem + ${pos(today)}% * ((100% - 10rem) / 100))` }} />
            {products.map((pr) => {
              const pa = acts.filter((a) => a.productId === pr.id && a.plannedDate && a.state !== "NotApplicable");
              return (
                <div key={pr.id} className="flex items-center border-b border-hairline/40 py-2 last:border-0">
                  <div className="w-40 shrink-0 pr-2">
                    <div className="truncate text-[12.5px] font-bold text-ink-strong">#{pr.srNo ?? "?"} {pr.partName}</div>
                    <div className="truncate text-[10.5px] text-ink-subtle">{pr.customer ?? ""}</div>
                  </div>
                  <div className="relative h-6 flex-1">
                    {STAGES.map((st, si) => {
                      const sa = pa.filter((a) => a.stage === st);
                      if (sa.length === 0) return null;
                      const ds = sa.map((a) => a.plannedDate!).sort();
                      const left = pos(ds[0]!), right = pos(ds[ds.length - 1]!);
                      const overdue = sa.some((a) => a.state === "Overdue");
                      const allDone = sa.every((a) => a.state === "Done");
                      return (
                        <button key={st} title={`${st}: ${fmtDate(ds[0])} → ${fmtDate(ds[ds.length - 1])}`}
                          onClick={() => openDrill(`${pr.partName} · ${st}`, sa)}
                          className="absolute top-1 h-4 rounded-full ring-1 ring-white/60 transition-transform hover:scale-y-125"
                          style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%`, background: overdue ? "#e11d2f" : allDone ? "#16a34a" : STAGE_FILL[si], opacity: allDone ? 0.55 : 1 }} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {/* legend */}
          <div className="mt-3 flex flex-wrap gap-3 pl-40 text-[11px] text-ink-subtle">
            {STAGES.map((st, i) => <span key={st} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_FILL[i] }} />{st}</span>)}
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />Done</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#e11d2f]" />Overdue</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-px bg-[#e11d2f]" />Today</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────────── SCHEDULE (D1) ─────────────────────────── */
function Schedule({ p, openDrill, acts }: ViewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={`Overdue activities (${p.overdue.length})`}><ScheduleTable rows={p.overdue} empty="Nothing overdue 🎉" /></Card>
      <Card title={`Due in next 14 days (${p.upcoming.length})`}><ScheduleTable rows={p.upcoming} empty="Nothing due soon." /></Card>
      <div className="lg:col-span-2">
        <Card title="Per-product progress — click for activities">
          <div className="space-y-3">
            {p.perProduct.map((pp) => (
              <button key={pp.id} type="button" className="block w-full rounded-xl border border-hairline p-3 text-left transition hover:border-[#1e40af]"
                onClick={() => openDrill(pp.partName, acts.filter((a) => a.productId === pp.id && a.state !== "NotApplicable"))}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink-strong">{pp.partName} <span className="ml-1 text-[12px] font-normal text-ink-subtle">{pp.customer ?? ""}</span></span>
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: HEALTH_COLOR[pp.health] }}>{pp.health}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-track,#e2e8f0)]"><div className="h-full rounded-full" style={{ width: `${pp.percentDone}%`, background: HEALTH_COLOR[pp.health] }} /></div>
                  <span className="w-10 text-right text-[13px] font-black text-ink-strong">{pp.percentDone}%</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────── shared ─────────────────────────── */
interface ViewProps { p: NpdPortfolio; openDrill: (title: string, rows: EnrichedActivity[], subtitle?: string) => void; acts: EnrichedActivity[]; }
const tooltipStyle = { borderRadius: 12, border: "1px solid rgba(15,23,42,0.1)", fontSize: 12 } as const;

function uniq(vals: (string | null | undefined)[]): string[] {
  return [...new Set(vals.map((v) => v?.trim()).filter((v): v is string => !!v))].sort();
}
function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((new Date(toISO + "T00:00:00Z").getTime() - new Date(fromISO + "T00:00:00Z").getTime()) / 86_400_000);
}
function monthTicks(minISO: string, maxISO: string): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(minISO + "T00:00:00Z"); d.setUTCDate(1);
  const end = new Date(maxISO + "T00:00:00Z");
  let guard = 0;
  while (d <= end && guard++ < 48) {
    const iso = d.toISOString().slice(0, 10);
    out.push({ iso, label: `${m[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` });
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}
function stateMatch(a: EnrichedActivity, label: string): boolean {
  if (label === "Done") return a.state === "Done";
  if (label === "Overdue") return a.state === "Overdue";
  if (label === "On Hold") return a.state === "OnHold";
  if (label === "Pending") return a.state === "OnTrack" || a.state === "DueToday";
  return false;
}
function Card({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-hairline bg-surface-card p-4">{title && <h3 className="mb-3 text-[14px] font-bold text-ink-strong">{title}</h3>}{children}</div>;
}
function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return <div className="rounded-xl border border-hairline px-3 py-2.5 text-center"><div className="text-[20px] font-black" style={{ color: color ?? "var(--color-ink-strong)" }}>{value}</div><div className="mt-0.5 text-[11px] font-bold uppercase text-ink-subtle">{label}</div></div>;
}
function Gauge({ value }: { value: number }) {
  const data = [{ name: "v", value, fill: value >= 80 ? "#16a34a" : value >= 40 ? "#1e40af" : "#d97706" }];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={170}>
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={12} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[34px] font-black text-ink-strong">{value}%</span></div>
    </div>
  );
}
function ClickStat({ label, value, sub, color, onClick }: { label: string; value: number; sub: string; color: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-hairline px-6 py-3 text-center transition hover:border-[#1e40af]"><div className="text-[28px] font-black leading-none" style={{ color }}>{value}</div><div className="mt-1 text-[12px] font-bold text-ink-strong">{label}</div><div className="text-[11px] text-ink-subtle">{sub}</div></button>;
}
function DonutBlock({ slices, center, centerLabel, onSlice }: { slices: { label: string; value: number; color: string }[]; center: string; centerLabel: string; onSlice?: (label: string) => void }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 py-2">
      <Donut data={slices} size={150} centerValue={center} centerLabel={centerLabel} />
      <ul className="space-y-1.5">
        {slices.map((s) => (
          <li key={s.label}><button type="button" disabled={!onSlice} onClick={() => onSlice?.(s.label)} className={`flex items-center gap-2 text-[13px] text-ink-muted ${onSlice ? "hover:text-ink-strong" : ""}`}>
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} /><span className="font-semibold text-ink-strong">{s.value}</span> {s.label}{total > 0 && <span className="text-ink-subtle">· {Math.round((s.value / total) * 100)}%</span>}
          </button></li>
        ))}
      </ul>
    </div>
  );
}
function ActivityList({ rows, onRow, showProduct }: { rows: EnrichedActivity[]; onRow?: (a: EnrichedActivity) => void; showProduct?: boolean }) {
  if (rows.length === 0) return <p className="py-6 text-center text-[13.5px] text-ink-subtle">No activities.</p>;
  return (
    <div className="max-h-[420px] overflow-y-auto">
      <table className="w-full text-left text-[13px]">
        <thead className="sticky top-0 bg-surface-card"><tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-ink-subtle">
          {showProduct && <th className="py-2 pr-2 font-bold">Product</th>}<th className="py-2 pr-2 font-bold">Stage</th><th className="py-2 pr-2 font-bold">Activity</th><th className="py-2 pr-2 font-bold">Doer</th><th className="py-2 pr-2 font-bold text-right">Planned</th><th className="py-2 font-bold text-right">Status</th>
        </tr></thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={`${a.productId}-${a.code}-${i}`} className={`border-b border-hairline/50 last:border-0 ${onRow ? "cursor-pointer hover:bg-[rgba(30,64,175,0.04)]" : ""}`} onClick={() => onRow?.(a)}>
              {showProduct && <td className="py-2 pr-2 font-semibold text-ink-strong">{a.partName}</td>}
              <td className="py-2 pr-2 text-ink-subtle">{a.stageShort}</td>
              <td className="py-2 pr-2 text-ink-muted"><b>{a.code}</b> {a.activityPlan}{a.customer && <span className="ml-1 rounded bg-[#eff6ff] px-1 text-[10px] font-bold text-[#1e40af]">CUST</span>}</td>
              <td className="py-2 pr-2 text-ink-muted">{a.doerName ?? "—"}</td>
              <td className="py-2 pr-2 text-right text-ink-muted">{fmtDate(a.plannedDate)}</td>
              <td className="py-2 text-right font-bold" style={{ color: STATE_COLOR[a.state] }}>{a.stateLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ScheduleTable({ rows, empty }: { rows: { productId: string; partName: string; code: string; activityPlan: string; plannedDate: string; daysLeft: number; doerName: string | null; overdue: boolean }[]; empty: string }) {
  if (rows.length === 0) return <p className="py-8 text-center text-[13.5px] text-ink-subtle">{empty}</p>;
  return (
    <div className="max-h-[360px] overflow-y-auto">
      <table className="w-full text-left text-[13px]">
        <thead className="sticky top-0 bg-surface-card"><tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-ink-subtle"><th className="py-2 pr-2 font-bold">Product</th><th className="py-2 pr-2 font-bold">Activity</th><th className="py-2 pr-2 font-bold">Doer</th><th className="py-2 pr-2 font-bold text-right">Planned</th><th className="py-2 font-bold text-right">Days</th></tr></thead>
        <tbody>
          {rows.slice(0, 100).map((r, i) => (
            <tr key={`${r.productId}-${r.code}-${i}`} className="border-b border-hairline/50 last:border-0">
              <td className="py-2 pr-2 font-semibold text-ink-strong">{r.partName}</td>
              <td className="py-2 pr-2 text-ink-muted"><b>{r.code}</b> {r.activityPlan}</td>
              <td className="py-2 pr-2 text-ink-muted">{r.doerName ?? "—"}</td>
              <td className="py-2 pr-2 text-right text-ink-muted">{fmtDate(r.plannedDate)}</td>
              <td className="py-2 text-right font-bold" style={{ color: r.overdue ? "#e11d2f" : "#1e40af" }}>{r.overdue ? `${Math.abs(r.daysLeft)}d late` : `${r.daysLeft}d`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function DrillDrawer({ drill, onClose }: { drill: Drill | null; onClose: () => void }) {
  const productId = drill?.rows[0]?.productId;
  const sameProduct = drill?.rows.every((r) => r.productId === productId);
  return (
    <Dialog.Root open={!!drill} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-[min(720px,96vw)] overflow-y-auto border-l border-hairline bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-[19px] font-black text-ink-strong">{drill?.title}</Dialog.Title>
              {drill?.subtitle && <p className="text-[13px] text-ink-subtle">{drill.subtitle}</p>}
              <p className="mt-0.5 text-[12.5px] text-ink-subtle">{drill?.rows.length ?? 0} activities</p>
            </div>
            <div className="flex items-center gap-2">
              {sameProduct && productId && <Link href={`/npd/${productId}` as Route} className="inline-flex items-center gap-1 rounded-lg border border-hairline px-3 py-1.5 text-[12.5px] font-bold text-[#1e40af] hover:border-[#1e40af]">Open product <ArrowUpRight size={13} /></Link>}
              <Dialog.Close className="rounded-lg border border-hairline p-1.5 text-ink-subtle hover:text-ink-strong"><X size={16} /></Dialog.Close>
            </div>
          </div>
          {drill && <ActivityList rows={drill.rows} showProduct={!sameProduct} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
