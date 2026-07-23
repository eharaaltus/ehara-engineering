"use client";

/**
 * The Task Tracker — every activity across every product, on one surface.
 *
 * This is the screen the app was missing entirely: until now you could only see
 * activities by opening one product at a time, which is exactly the thing the
 * spreadsheet's flat Task_Tracker tab did better. This is that tab, with the
 * things a spreadsheet can't do: live quick-filters with counts, working-day
 * maths, inline editing that writes straight to Postgres AND the sheet, and bulk
 * actions — above all "shift these dates by N working days", which turns a
 * fourteen-edit afternoon into one action with a recorded reason.
 */

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search, X, Download, CalendarClock, UserCog, CheckCheck, Ban, ChevronDown, ChevronRight,
  Link2, AlertTriangle, ListChecks, Boxes, Lock, Flame, MoreHorizontal, Check,
} from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { fireToast } from "@/lib/toast";
import { STATE_META, BRAND, type Activity, type Product } from "@/lib/npd/model";
import { NPD_STAGES, STAGE_SHORT, fmtDate } from "@/lib/npd/status";
import { StateChip, SlipChip, AutoRefresh, Tip, TooltipRoot } from "@/components/npd/bits";
import {
  updateActivity, bulkSetResolution, bulkSetApplicability, bulkAssign, bulkShiftDates,
  type Field,
} from "@/app/(app)/npd/tracker/actions";

type Emp = { id: string; name: string };

/** The quick-filter tabs ARE the product. A filter you have to construct by hand
 *  is a filter nobody uses, so the ten questions people actually ask each morning
 *  are one click each, with a live count. */
type TabId =
  | "all" | "mine" | "overdue" | "week" | "gate" | "hold" | "unassigned" | "evidence" | "slipping" | "done";

interface TabDef {
  id: TabId;
  label: string;
  hint: string;
}

// The five people actually click every morning stay visible as pills. The other
// five are real but occasional — they live in a "More" menu so the tab row reads
// as five choices, not ten.
const PRIMARY_TABS: TabDef[] = [
  { id: "all", label: "All", hint: "Every applicable activity" },
  { id: "mine", label: "My work", hint: "Open and assigned to you" },
  { id: "overdue", label: "Overdue", hint: "Past its planned date and not done" },
  { id: "week", label: "Due 7 days", hint: "Planned within the next 7 days" },
  { id: "gate", label: "Blocking a gate", hint: "Open activities in each product's CURRENT stage — the only ones actually holding a gate shut" },
];

const MORE_TABS: TabDef[] = [
  { id: "unassigned", label: "Unassigned", hint: "Open, applicable, and nobody owns it. Nobody is going to do these." },
  { id: "evidence", label: "Missing evidence", hint: "Marked Done, but the drawing/document link is empty — this is what fails a customer audit" },
  { id: "slipping", label: "Slipping", hint: "The planned date has been pushed past the frozen baseline. Not overdue — re-planned. The quietest failure there is." },
  { id: "hold", label: "On hold", hint: "Paused. Every one of these should carry a reason." },
  { id: "done", label: "Done", hint: "Completed activities" },
];

const TABS: TabDef[] = [...PRIMARY_TABS, ...MORE_TABS];

export function TrackerWorkspace({
  products,
  employees,
  meId,
}: {
  products: Product[];
  employees: Emp[];
  meId: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [tab, setTab] = React.useState<TabId>("all");
  const [q, setQ] = React.useState("");
  const [productId, setProductId] = React.useState(params.get("product") ?? "");
  const [stage, setStage] = React.useState(params.get("stage") ?? "");
  const [doerId, setDoerId] = React.useState("");
  const [groupBy, setGroupBy] = React.useState<"product" | "stage" | "doer" | "none">("product");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Flatten every product's activities into one list. This is the whole point of
  // the page — the work exists across products, not inside one.
  const all = React.useMemo(
    () => products.filter((p) => !p.archived).flatMap((p) => p.activities),
    [products],
  );

  const matchTab = React.useCallback(
    (a: Activity, t: TabId): boolean => {
      switch (t) {
        case "all": return a.isApplicable;
        case "mine": return a.isOpen && !!meId && a.doerId === meId;
        case "overdue": return a.state === "Overdue";
        case "week": return a.isOpen && a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= 7;
        case "gate": return a.blocksGate;
        case "hold": return a.state === "OnHold";
        case "unassigned": return a.isOpen && !a.doerId;
        case "evidence": return a.missingEvidence;
        case "slipping": return a.slipDays > 0 && a.isOpen;
        case "done": return a.state === "Done";
      }
    },
    [meId],
  );

  const counts = React.useMemo(() => {
    const c = {} as Record<TabId, number>;
    for (const t of TABS) c[t.id] = all.filter((a) => matchTab(a, t.id)).length;
    return c;
  }, [all, matchTab]);

  const rows = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return all
      .filter((a) => matchTab(a, tab))
      .filter((a) => (productId ? a.productId === productId : true))
      .filter((a) => (stage ? a.stage === stage : true))
      .filter((a) => (doerId ? a.doerId === doerId : true))
      .filter((a) =>
        !query
          ? true
          : a.activityPlan.toLowerCase().includes(query) ||
            a.code.toLowerCase().includes(query) ||
            a.productPartName.toLowerCase().includes(query) ||
            (a.doerName ?? "").toLowerCase().includes(query),
      )
      .sort((x, y) => {
        // Overdue first, then by planned date. What's on fire goes on top.
        const ox = x.state === "Overdue" ? 0 : 1;
        const oy = y.state === "Overdue" ? 0 : 1;
        if (ox !== oy) return ox - oy;
        return (x.plannedDate ?? "9999").localeCompare(y.plannedDate ?? "9999");
      });
  }, [all, tab, q, productId, stage, doerId, matchTab]);

  const groups = React.useMemo(() => {
    if (groupBy === "none") return [{ key: "", label: "", items: rows }];
    const map = new Map<string, Activity[]>();
    for (const a of rows) {
      const key =
        groupBy === "product"
          ? `${a.productSrNo ?? "—"} · ${a.productPartName}`
          : groupBy === "stage"
            ? a.stage
            : a.doerName ?? "Unassigned";
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return [...map.entries()].map(([key, items]) => ({ key, label: key, items }));
  }, [rows, groupBy]);

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

  // A bulk action must NEVER touch a row the user can't currently see — that is
  // how you shift the dates of forty activities you never looked at. Rather than
  // clearing the selection in an effect (which cascades renders), intersect it
  // with what's on screen at the moment of use. Same guarantee, no effect, and
  // narrowing then re-widening a filter doesn't silently throw away the ticks.
  const active = React.useMemo(() => {
    const onScreen = new Set(visibleIds);
    return new Set([...selected].filter((id) => onScreen.has(id)));
  }, [selected, visibleIds]);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => active.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  }
  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const filtering = q || productId || stage || doerId;

  const totals = {
    all: counts.all,
    overdue: counts.overdue,
    gate: counts.gate,
    mine: counts.mine,
  };

  return (
    <TooltipRoot>
      <AutoRefresh />
      <PageHero
        eyebrow="New Product Development"
        title="Task Tracker"
        subtitle="Every activity, across every product, on one surface. Edit any cell inline — it saves to the database and mirrors into the Google Sheet."
        Icon={ListChecks}
        stats={[
          { label: "Activities", value: totals.all, icon: Boxes, from: "#1e40af", to: "#3b82f6" },
          { label: "Overdue", value: totals.overdue, icon: Flame, from: "#e11d2f", to: "#f43f5e" },
          { label: "Blocking a gate", value: totals.gate, icon: Lock, from: "#7c3aed", to: "#a855f7" },
          { label: "My work", value: totals.mine, icon: UserCog, from: "#0f766e", to: "#14b8a6" },
        ]}
        actions={
          <Link
            href={"/npd" as Route}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-extrabold text-ink-strong shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
          >
            <Boxes size={16} strokeWidth={2.5} /> Products
          </Link>
        }
      />

      {/* ── Quick-filter tabs: five daily ones as pills, the rest in "More". A
             row of ten equal choices is noise; five plus a menu is a decision. ── */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {PRIMARY_TABS.map((t) => (
          <TabPill key={t.id} t={t} on={tab === t.id} n={counts[t.id]} onClick={() => setTab(t.id)} />
        ))}
        <MoreTabs current={tab} counts={counts} onPick={setTab} />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activity, code, part, doer…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] text-ink-strong shadow-sm outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[rgba(30,64,175,0.10)]"
          />
        </div>
        <Sel value={productId} onChange={setProductId} placeholder="All products"
          options={products.filter((p) => !p.archived).map((p) => ({ v: p.id, l: `#${p.srNo ?? "—"} ${p.partName}` }))} />
        <Sel value={stage} onChange={setStage} placeholder="All stages"
          options={NPD_STAGES.map((s) => ({ v: s, l: STAGE_SHORT[s] ?? s }))} />
        <Sel value={doerId} onChange={setDoerId} placeholder="All doers"
          options={employees.map((e) => ({ v: e.id, l: e.name }))} />
        {filtering && (
          <button
            onClick={() => { setQ(""); setProductId(""); setStage(""); setDoerId(""); }}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-ink-subtle shadow-sm transition hover:text-ink-strong"
          >
            <X size={13} /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Sel value={groupBy} onChange={(v) => setGroupBy(v as typeof groupBy)} placeholder="Group by"
            options={[
              { v: "product", l: "Group: Product" },
              { v: "stage", l: "Group: Stage" },
              { v: "doer", l: "Group: Doer" },
              { v: "none", l: "No grouping" },
            ]} />
          <button
            onClick={() => exportCsv(rows)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-ink-subtle shadow-sm transition hover:text-[var(--color-brand-blue)]"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="mt-3 text-[12.5px] font-semibold text-ink-subtle">
        {rows.length} activit{rows.length === 1 ? "y" : "ies"}
      </div>

      <div className="mt-2">
        {rows.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div
            className="premium-card thin-scroll overflow-x-auto rounded-2xl border bg-white"
            style={{ borderColor: "var(--color-hairline-strong)" }}
          >
            <table className="w-full min-w-[1240px] border-collapse text-[13px]">
              <thead>
                <tr style={{ background: "var(--color-surface-soft)" }}>
                  <Th className="w-[36px] px-2">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                  </Th>
                  <Th className="w-[150px]">Product</Th>
                  <Th className="w-[68px]">Stage</Th>
                  <Th className="w-[44px]">ID</Th>
                  <Th>Activity</Th>
                  <Th className="w-[112px]">Doer</Th>
                  <Th className="w-[108px]">Planned</Th>
                  <Th className="w-[94px]" hint="WORKING days — weekends and the company holiday calendar are excluded. The sheet's TODAY()−planned subtraction counts Sundays and Diwali as working days.">
                    Days left
                  </Th>
                  <Th className="w-[106px]">Resolution</Th>
                  <Th className="w-[108px]">Applicability</Th>
                  <Th className="w-[70px]">Slip</Th>
                  <Th className="w-[44px]">Doc</Th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Group
                    key={g.key || "flat"}
                    label={g.label}
                    items={g.items}
                    selected={active}
                    onToggle={toggle}
                    employees={employees}
                    grouped={groupBy !== "none"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {active.size > 0 && (
        <BulkBar
          ids={[...active]}
          employees={employees}
          onClear={() => setSelected(new Set())}
          onDone={() => { setSelected(new Set()); router.refresh(); }}
        />
      )}
    </TooltipRoot>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function TabPill({ t, on, n, onClick }: { t: TabDef; on: boolean; n: number; onClick: () => void }) {
  const alarming = (t.id === "overdue" || t.id === "gate") && n > 0;
  return (
    <Tip content={t.hint}>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12.5px] font-extrabold shadow-sm transition-all hover:-translate-y-px"
        style={
          on
            ? { background: BRAND.gradient, color: "#fff", borderColor: "transparent", boxShadow: "0 10px 22px -12px rgba(30,64,175,0.6)" }
            : {
                background: "#fff",
                color: alarming ? "var(--color-red-deep)" : "var(--color-ink-subtle)",
                borderColor: alarming ? "var(--color-red)" : "var(--color-hairline-strong)",
              }
        }
      >
        {t.label}
        <span
          className="rounded-full px-1.5 py-px text-[10px] font-black tabular-nums"
          style={{
            background: on ? "rgba(255,255,255,0.22)" : alarming ? "var(--color-red-bg)" : "var(--color-surface-track)",
            color: on ? "#fff" : alarming ? "var(--color-red-deep)" : "var(--color-ink-subtle)",
          }}
        >
          {n}
        </span>
      </button>
    </Tip>
  );
}

/** The five occasional filters, tucked into one menu so the tab row stays calm.
 *  When one of them IS the active filter, the trigger adopts it as a pill so the
 *  current state is never hidden inside a closed menu. */
function MoreTabs({
  current, counts, onPick,
}: {
  current: TabId;
  counts: Record<TabId, number>;
  onPick: (id: TabId) => void;
}) {
  const activeMore = MORE_TABS.find((t) => t.id === current);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12.5px] font-extrabold shadow-sm transition-all hover:-translate-y-px"
          style={
            activeMore
              ? { background: BRAND.gradient, color: "#fff", borderColor: "transparent", boxShadow: "0 10px 22px -12px rgba(30,64,175,0.6)" }
              : { background: "#fff", color: "var(--color-ink-subtle)", borderColor: "var(--color-hairline-strong)" }
          }
        >
          <MoreHorizontal size={14} />
          {activeMore ? activeMore.label : "More"}
          {activeMore && (
            <span className="rounded-full bg-white/22 px-1.5 py-px text-[10px] font-black tabular-nums">
              {counts[activeMore.id]}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {MORE_TABS.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => onPick(t.id)}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-2">
              {current === t.id ? <Check size={14} className="text-[var(--color-brand-blue)]" /> : <span className="w-[14px]" />}
              {t.label}
            </span>
            <span className="rounded-full bg-[var(--color-surface-track)] px-1.5 py-px text-[10px] font-black tabular-nums text-ink-subtle">
              {counts[t.id]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Group({
  label, items, selected, onToggle, employees, grouped,
}: {
  label: string;
  items: Activity[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  employees: Emp[];
  grouped: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  const overdue = items.filter((a) => a.state === "Overdue").length;

  return (
    <>
      {grouped && (
        <tr className="border-t" style={{ background: "var(--color-surface-soft)", borderColor: "var(--color-hairline-strong)" }}>
          <td colSpan={12} className="px-2.5 py-2">
            <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-[12px] font-black text-ink-strong">
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {label}
              <span className="rounded-full bg-white px-1.5 py-px text-[10px] font-bold text-ink-subtle">{items.length}</span>
              {overdue > 0 && (
                <span
                  className="rounded-full px-1.5 py-px text-[10px] font-black"
                  style={{ background: "var(--color-red-bg)", color: "var(--color-red-deep)" }}
                >
                  {overdue} overdue
                </span>
              )}
            </button>
          </td>
        </tr>
      )}
      {open && items.map((a) => (
        <Row key={a.id} a={a} checked={selected.has(a.id)} onToggle={onToggle} employees={employees} />
      ))}
    </>
  );
}

function Row({
  a, checked, onToggle, employees,
}: {
  a: Activity;
  checked: boolean;
  onToggle: (id: string) => void;
  employees: Emp[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function save(field: Field, value: string | null) {
    start(async () => {
      const res = await updateActivity(a.id, field, value);
      if (res.ok) router.refresh();
      else fireToast({ message: res.error, type: "error" });
    });
  }

  const dim = a.state === "NotApplicable";

  return (
    <tr
      className={`border-t transition-colors hover:bg-[var(--color-surface-soft)] ${dim ? "opacity-55" : ""} ${pending ? "animate-pulse" : ""}`}
      style={{
        borderColor: "var(--color-hairline)",
        ...(checked ? { background: "var(--color-blue-bg)" } : {}),
      }}
    >
      <Td className="px-2">
        <input type="checkbox" checked={checked} onChange={() => onToggle(a.id)} aria-label={`Select ${a.code}`} />
      </Td>
      <Td>
        <Link href={`/npd/${a.productId}` as Route} className="block truncate text-[12px] font-bold text-ink-strong hover:text-[#1e40af]">
          <span className="text-ink-subtle">#{a.productSrNo ?? "—"}</span> {a.productPartName}
        </Link>
      </Td>
      <Td>
        <span className="text-[11px] font-bold text-ink-subtle">{STAGE_SHORT[a.stage] ?? a.stage}</span>
      </Td>
      <Td>
        <span
          className="rounded px-1 py-0.5 text-[10px] font-black"
          style={{ background: "var(--color-surface-track)", color: "var(--color-ink)" }}
        >
          {a.code}
        </span>
      </Td>
      <Td>
        <span className={`block truncate font-semibold text-ink-strong ${dim ? "line-through" : ""}`} title={a.activityPlan}>
          {a.activityPlan}
        </span>
        {a.reasons && <span className="block truncate text-[11px] italic text-ink-subtle">{a.reasons}</span>}
        {a.blocksGate && a.state === "Overdue" && (
          <span
            className="mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-black uppercase tracking-wide"
            style={{ background: "var(--color-red-bg)", color: "var(--color-red-deep)" }}
          >
            <AlertTriangle size={9} /> blocking gate
          </span>
        )}
      </Td>
      <Td>
        <InlineSelect
          value={a.doerId ?? ""}
          onSave={(v) => save("doerId", v || null)}
          options={[{ v: "", l: "— unassigned" }, ...employees.map((e) => ({ v: e.id, l: e.name }))]}
          color={!a.doerId ? "var(--color-amber-deep)" : undefined}
        />
      </Td>
      <Td>
        <input
          type="date"
          defaultValue={a.plannedDate ?? ""}
          onChange={(e) => save("plannedDate", e.target.value || null)}
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[12px] font-semibold text-ink-strong transition hover:border-[var(--color-hairline-strong)] hover:bg-white focus:border-[var(--color-brand-blue)] focus:bg-white focus:outline-none"
        />
      </Td>
      <Td><StateChip a={a} /></Td>
      <Td>
        <InlineSelect
          value={a.resolution}
          onSave={(v) => save("resolution", v)}
          options={[{ v: "Open", l: "Open" }, { v: "Done", l: "Done" }, { v: "On Hold", l: "On Hold" }]}
          color={STATE_META[a.state].color}
        />
      </Td>
      <Td>
        <InlineSelect
          value={a.applicability}
          onSave={(v) => save("applicability", v)}
          options={[{ v: "Applicable", l: "Applicable" }, { v: "N/A", l: "N/A" }, { v: "On Hold", l: "On Hold" }]}
        />
      </Td>
      <Td><SlipChip days={a.slipDays} label="" /></Td>
      <Td>
        {a.drawingLink ? (
          <Tip content={a.drawingLink}>
            <a
              href={a.drawingLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-[var(--color-brand-blue)] transition hover:text-[var(--color-brand-blue-deep)]"
            >
              <Link2 size={14} />
            </a>
          </Tip>
        ) : a.missingEvidence ? (
          <Tip content="Marked Done but no drawing/document is attached. This is what a customer audit catches.">
            <span style={{ color: "var(--color-amber-deep)" }}><AlertTriangle size={14} /></span>
          </Tip>
        ) : (
          <span className="text-ink-subtle">—</span>
        )}
      </Td>
    </tr>
  );
}

/** Single click = edit. Saves on change — no Save button, no modal, no spinner. */
function InlineSelect({
  value, onSave, options, color,
}: {
  value: string;
  onSave: (v: string) => void;
  options: { v: string; l: string }[];
  color?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value)}
      className="w-full cursor-pointer rounded-md border border-transparent bg-transparent px-1 py-1 text-[12px] font-bold transition hover:border-[var(--color-hairline-strong)] hover:bg-white focus:border-[var(--color-brand-blue)] focus:bg-white focus:outline-none"
      style={{ color: color ?? "var(--color-ink)" }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v} style={{ color: "var(--color-ink)" }}>{o.l}</option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Bulk action bar — sticky at the bottom, Linear-style.
// ═══════════════════════════════════════════════════════════════════════════

function BulkBar({
  ids, employees, onClear, onDone,
}: {
  ids: string[];
  employees: Emp[];
  onClear: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [shiftOpen, setShiftOpen] = React.useState(false);
  const [naOpen, setNaOpen] = React.useState(false);

  async function run(fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      fireToast({ message: res.message, type: "success" });
      onDone();
    } else {
      fireToast({ message: res.error, type: "error" });
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <div
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5"
          style={{
            background: "linear-gradient(135deg, #14245c, #0a0a0a)",
            boxShadow: "0 26px 60px -22px rgba(15,40,80,0.65)",
          }}
        >
          <span className="px-1.5 text-[13px] font-black text-white">{ids.length} selected</span>
          <span className="h-5 w-px bg-white/20" />

          <BulkBtn onClick={() => run(() => bulkSetResolution(ids, "Done"))} disabled={busy} icon={<CheckCheck size={14} />}>
            Mark Done
          </BulkBtn>
          <BulkBtn onClick={() => setShiftOpen(true)} disabled={busy} icon={<CalendarClock size={14} />}>
            Shift dates
          </BulkBtn>
          <BulkBtn onClick={() => setNaOpen(true)} disabled={busy} icon={<Ban size={14} />}>
            Mark N/A
          </BulkBtn>

          <span className="h-5 w-px bg-white/20" />
          <UserCog size={14} className="text-white/60" />
          <select
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) run(() => bulkAssign(ids, "doer", v));
              e.target.value = "";
            }}
            className="h-8 rounded-lg border-0 bg-white/10 px-2 text-[12px] font-bold text-white outline-none"
          >
            <option value="" style={{ color: "#0a0a0a" }}>Assign doer…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id} style={{ color: "#0a0a0a" }}>{e.name}</option>
            ))}
          </select>

          <span className="h-5 w-px bg-white/20" />
          <button onClick={onClear} className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Clear selection">
            <X size={15} />
          </button>
        </div>
      </div>

      {shiftOpen && (
        <ShiftDialog ids={ids} onClose={() => setShiftOpen(false)} onDone={() => { setShiftOpen(false); onDone(); }} />
      )}
      {naOpen && (
        <ReasonDialog
          title="Mark as N/A"
          blurb="N/A activities are removed from every percentage in the app. Six months from now, someone will ask why this bracket skipped this step — the reason is the only answer they'll get."
          confirmLabel="Mark N/A"
          onClose={() => setNaOpen(false)}
          onConfirm={async (reason) => {
            const res = await bulkSetApplicability(ids, "N/A", reason);
            if (res.ok) { fireToast({ message: res.message, type: "success" }); setNaOpen(false); onDone(); }
            else fireToast({ message: res.error, type: "error" });
          }}
        />
      )}
    </>
  );
}

function BulkBtn({
  children, onClick, disabled, icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
    >
      {icon} {children}
    </button>
  );
}

/**
 * The most valuable dialog in the app.
 *
 * A tool slips two weeks: select the downstream activities, shift by +14 working
 * days, give one reason, done. In the spreadsheet that's fourteen hand edits and
 * the reason lives in someone's head.
 *
 * Working days, not calendar days — so a shift never lands a plan on a Sunday.
 */
function ShiftDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = React.useState(7);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await bulkShiftDates(ids, days, reason);
    setBusy(false);
    if (res.ok) { fireToast({ message: res.message, type: "success" }); onDone(); }
    else fireToast({ message: res.error, type: "error" });
  }

  return (
    <Shell title="Shift planned dates" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-[13px] text-ink-subtle">
          Move <b className="text-ink-strong">{ids.length}</b> activit{ids.length === 1 ? "y" : "ies"} by{" "}
          <b className="text-ink-strong">working</b> days — weekends and holidays are skipped, so nothing lands on a
          Sunday. The frozen baseline does <b>not</b> move: the gap this opens up is exactly the slip you'll now be able
          to see.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {[-7, -1, 1, 3, 7, 14].map((d) => {
            const on = days === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className="rounded-lg border px-2.5 py-1.5 text-[12px] font-black transition"
                style={{
                  borderColor: on ? "var(--color-brand-blue)" : "var(--color-hairline-strong)",
                  background: on ? "var(--color-blue-bg)" : "#fff",
                  color: on ? "var(--color-brand-blue)" : "var(--color-ink-subtle)",
                }}
              >
                {d > 0 ? `+${d}` : d}
              </button>
            );
          })}
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
            className="h-10 w-20 rounded-lg border border-slate-200 px-2 text-[13px] font-bold text-ink-strong outline-none focus:border-[var(--color-brand-blue)]"
          />
          <span className="text-[12px] font-semibold text-ink-subtle">working days</span>
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-bold text-ink-strong">Reason (required)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Tool vendor delayed T1 delivery by 2 weeks"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[rgba(30,64,175,0.10)]"
          />
          <p className="mt-1.5 text-[11.5px] text-ink-subtle">
            Written to every activity you move. Do this consistently and in six months you’ll have the only dataset that
            matters: <i>why Ehara is late</i>.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-bold text-ink-strong transition hover:bg-[var(--color-surface-soft)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !reason.trim() || days === 0}
            className="rounded-lg px-4 py-2.5 text-[13px] font-extrabold text-white shadow-lg transition disabled:opacity-50"
            style={{ background: BRAND.gradient }}
          >
            {busy ? "Shifting…" : `Shift ${ids.length}`}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function ReasonDialog({
  title, blurb, confirmLabel, onClose, onConfirm,
}: {
  title: string;
  blurb: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  return (
    <Shell title={title} onClose={onClose}>
      <p className="text-[13px] text-ink-subtle">{blurb}</p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason…"
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[rgba(30,64,175,0.10)]"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-bold text-ink-strong transition hover:bg-[var(--color-surface-soft)]"
        >
          Cancel
        </button>
        <button
          disabled={busy || !reason.trim()}
          onClick={async () => { setBusy(true); await onConfirm(reason); setBusy(false); }}
          className="rounded-lg px-4 py-2.5 text-[13px] font-extrabold text-white shadow-lg transition disabled:opacity-50"
          style={{ background: BRAND.gradient }}
        >
          {busy ? "Saving…" : confirmLabel}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0a0a0a]/45 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(560px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-white/80 bg-white p-6"
          style={{ boxShadow: "0 34px 80px -30px rgba(15,40,80,0.45)" }}
        >
          <Dialog.Title
            className="mb-3 text-[19px] text-ink-strong"
            style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}
          >
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({ tab }: { tab: TabId }) {
  const msg: Record<TabId, string> = {
    all: "No activities yet. Create a product and its 36 activities generate themselves.",
    mine: "Nothing assigned to you is open. Enjoy it.",
    overdue: "Nothing is overdue. 🎉",
    week: "Nothing due in the next 7 days.",
    gate: "No gate is blocked — every current-stage activity is resolved.",
    hold: "Nothing is on hold.",
    unassigned: "Every open activity has an owner.",
    evidence: "Every completed activity that needs a drawing has one.",
    slipping: "No plan has been pushed past its baseline. The schedule you committed to is the schedule you're running.",
    done: "Nothing completed yet.",
  };
  return (
    <div
      className="rounded-2xl border border-dashed bg-white p-14 text-center text-[13px] text-ink-subtle"
      style={{ borderColor: "var(--color-hairline-strong)" }}
    >
      {msg[tab]}
    </div>
  );
}

function Sel({
  value, onChange, placeholder, options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { v: string; l: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 max-w-[190px] rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] font-bold text-ink-strong shadow-sm outline-none transition focus:border-[var(--color-brand-blue)]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}

function Th({
  children, className = "", hint,
}: {
  children?: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  const inner = hint ? (
    <Tip content={hint}>
      <span className="cursor-help border-b border-dotted border-current">{children}</span>
    </Tip>
  ) : (
    children
  );
  return (
    <th className={`px-2.5 py-2.5 text-left text-[10.5px] font-black uppercase tracking-[0.06em] text-ink-subtle ${className}`}>
      {inner}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-2.5 py-2 align-middle ${className}`}>{children}</td>;
}

function exportCsv(rows: Activity[]) {
  const head = ["Product #", "Part Name", "Stage", "ID", "Activity", "Doer", "Supervisor", "Planned", "Baseline", "Days Left (workdays)", "Status", "Resolution", "Completion", "Applicability", "Slip (workdays)", "Link", "Reason"];
  const body = rows.map((a) => [
    a.productSrNo ?? "", a.productPartName, a.stage, a.code, a.activityPlan,
    a.doerName ?? "", a.supervisorName ?? "", a.plannedDate ?? "", a.baselineDate ?? "",
    a.daysLeft ?? "", a.label, a.resolution, a.completionDate ?? "", a.applicability,
    a.slipDays, a.drawingLink ?? "", a.reasons ?? "",
  ]);
  const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ehara-npd-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
