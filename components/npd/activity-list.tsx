"use client";

/**
 * The 36 activities of a product, grouped into six collapsible stage sections
 * with inline editing. Shared by the full-page product detail and the right-side
 * drawer so "a product's task tracker" looks and behaves identically wherever it
 * appears, and there's one place to change it.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Link2, AlertTriangle } from "lucide-react";
import { fireToast } from "@/lib/toast";
import { STATE_META, type Activity, type Product } from "@/lib/npd/model";
import { NPD_STAGES } from "@/lib/npd/status";
import { StateChip, SlipChip, ProgressBar, Tip } from "@/components/npd/bits";
import { updateActivity, type Field } from "@/app/(app)/npd/tracker/actions";

type Emp = { id: string; name: string };

export function StageList({ product, employees, compact = false }: { product: Product; employees: Emp[]; compact?: boolean }) {
  return (
    <div className="space-y-3">
      {NPD_STAGES.map((stage) => {
        const sp = product.stages.find((s) => s.stage === stage)!;
        const acts = product.activities.filter((a) => a.stage === stage);
        if (!acts.length) return null;
        return <StageSection key={stage} stage={stage} progress={sp} activities={acts} employees={employees} compact={compact} />;
      })}
    </div>
  );
}

function StageSection({
  stage, progress, activities, employees, compact,
}: {
  stage: string;
  progress: Product["stages"][number];
  activities: Activity[];
  employees: Emp[];
  compact: boolean;
}) {
  const [open, setOpen] = React.useState(progress.state === "current" || progress.overdue > 0);

  const dot =
    progress.state === "complete"
      ? "var(--color-green-deep)"
      : progress.overdue > 0
        ? "var(--color-red-deep)"
        : progress.state === "current"
          ? "var(--color-brand-blue)"
          : "var(--color-stone)";

  return (
    <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--color-hairline-strong)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-soft)]"
      >
        {open ? <ChevronDown size={16} className="text-ink-subtle" /> : <ChevronRight size={16} className="text-ink-subtle" />}
        <span className="inline-block size-2 rounded-full" style={{ background: dot }} />
        <h2 className="text-[12.5px] font-black uppercase tracking-wide text-ink-strong">{stage}</h2>
        {progress.gateOpen && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: "var(--color-green-bg)", color: "var(--color-green-deep)" }}>
            ✓ passed
          </span>
        )}
        {progress.overdue > 0 && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: "var(--color-red-bg)", color: "var(--color-red-deep)" }}>
            {progress.overdue} overdue
          </span>
        )}
        <span className="ml-auto text-[12px] font-bold text-ink-subtle">{progress.done}/{progress.applicable}</span>
        {!compact && <div className="hidden w-24 sm:block"><ProgressBar pct={progress.pct} overdue={progress.overdue} /></div>}
      </button>

      {open && (
        <div className="thin-scroll overflow-x-auto border-t" style={{ borderColor: "var(--color-hairline)" }}>
          <table className="w-full border-collapse text-[13px]" style={{ minWidth: compact ? 640 : 780 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-soft)" }}>
                <Th className="w-[44px]">ID</Th>
                <Th>Activity</Th>
                <Th className="w-[120px]">Doer</Th>
                <Th className="w-[116px]">Planned</Th>
                <Th className="w-[92px]">Status</Th>
                <Th className="w-[108px]">Resolution</Th>
                {!compact && <Th className="w-[108px]">Applicability</Th>}
                <Th className="w-[40px]">Doc</Th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => <DetailRow key={a.id} a={a} employees={employees} compact={compact} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetailRow({ a, employees, compact }: { a: Activity; employees: Emp[]; compact: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const dim = a.state === "NotApplicable";

  function save(field: Field, value: string | null) {
    start(async () => {
      const res = await updateActivity(a.id, field, value);
      if (res.ok) router.refresh();
      else fireToast({ message: res.error, type: "error" });
    });
  }

  return (
    <tr
      className={`border-t transition-colors hover:bg-[var(--color-surface-soft)] ${dim ? "opacity-55" : ""} ${pending ? "animate-pulse" : ""}`}
      style={{ borderColor: "var(--color-hairline)" }}
    >
      <Td>
        <span className="rounded px-1 py-0.5 text-[10px] font-black" style={{ background: "var(--color-surface-track)", color: "var(--color-ink)" }}>
          {a.code}
        </span>
      </Td>
      <Td>
        <span className={`block font-semibold text-ink-strong ${dim ? "line-through" : ""}`}>{a.activityPlan}</span>
        {a.reasons && <span className="block text-[11px] italic text-ink-subtle">{a.reasons}</span>}
        {a.slipDays > 0 && <span className="mt-0.5 inline-block"><SlipChip days={a.slipDays} /></span>}
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
      {!compact && (
        <Td>
          <InlineSelect
            value={a.applicability}
            onSave={(v) => save("applicability", v)}
            options={[{ v: "Applicable", l: "Applicable" }, { v: "N/A", l: "N/A" }, { v: "On Hold", l: "On Hold" }]}
          />
        </Td>
      )}
      <Td>
        {a.drawingLink ? (
          <Tip content={a.drawingLink}>
            <a href={a.drawingLink} target="_blank" rel="noreferrer" className="inline-flex text-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue-deep)]">
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

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-2.5 py-2 text-left text-[10.5px] font-black uppercase tracking-[0.06em] text-ink-subtle ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-2.5 py-2 align-middle ${className}`}>{children}</td>;
}
