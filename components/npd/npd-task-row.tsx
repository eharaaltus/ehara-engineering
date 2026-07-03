"use client";

import { useState } from "react";
import { updateNpdTask } from "@/app/(app)/npd/actions";
import { computeNpd, fmtDate } from "@/lib/npd/status";

interface Emp { id: string; name: string }
export interface NpdRow {
  id: string;
  productId: string;
  code: string;
  activityPlan: string;
  doerId: string | null;
  plannedDate: string | null;
  completionDate: string | null;
  resolution: string;
  applicability: string;
  drawingLink: string | null;
  reasons: string | null;
}

const stateColor: Record<string, string> = {
  Overdue: "#e11d2f", DueToday: "#d97706", OnHold: "#b45309",
  Done: "#16a34a", NotApplicable: "#94a3b8", OnTrack: "#1e40af",
};

export function NpdTaskRow({ row, employees }: { row: NpdRow; employees: Emp[] }) {
  const [editing, setEditing] = useState(false);
  const c = computeNpd(row);
  const input = "rounded-lg border border-[var(--color-hairline-strong)] px-2 py-1 text-xs w-full";

  if (!editing) {
    return (
      <tr className="border-b border-[var(--color-hairline)] align-top last:border-0">
        <td className="py-2 pr-2 font-mono text-xs text-[var(--color-ink-subtle)]">{row.code}</td>
        <td className="py-2 pr-2 text-sm">{row.activityPlan}</td>
        <td className="py-2 pr-2 text-sm">{employees.find((e) => e.id === row.doerId)?.name ?? "—"}</td>
        <td className="whitespace-nowrap py-2 pr-2 text-sm">{fmtDate(row.plannedDate)}</td>
        <td className="whitespace-nowrap py-2 pr-2 text-sm font-bold" style={{ color: stateColor[c.state] }}>
          {c.label}
        </td>
        <td className="py-2 pr-2 text-sm">
          {row.drawingLink ? (
            <a href={row.drawingLink} target="_blank" rel="noreferrer" className="font-semibold text-[#1e40af] hover:underline">
              2D/3D ↗
            </a>
          ) : "—"}
        </td>
        <td className="py-2 pr-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-[var(--color-hairline-strong)] px-2 py-1 text-xs font-semibold hover:bg-[var(--color-surface-soft)]"
          >
            Edit
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)] align-top">
      <td className="py-2 pr-2 font-mono text-xs text-[var(--color-ink-subtle)]">{row.code}</td>
      <td colSpan={6} className="py-2">
        <form
          action={async (fd) => { await updateNpdTask(fd); setEditing(false); }}
          className="grid gap-2 md:grid-cols-3"
        >
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="productId" value={row.productId} />
          <div className="text-xs font-semibold md:col-span-3">{row.activityPlan}</div>

          <label className="text-xs">Doer
            <select name="doerId" defaultValue={row.doerId ?? ""} className={`${input} mt-0.5`}>
              <option value="">—</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <label className="text-xs">Resolution
            <select name="resolution" defaultValue={row.resolution} className={`${input} mt-0.5`}>
              {["Open", "Done", "On Hold"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="text-xs">Applicability
            <select name="applicability" defaultValue={row.applicability} className={`${input} mt-0.5`}>
              {["Applicable", "N/A", "On Hold"].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="text-xs">Planned Date
            <input type="date" name="plannedDate" defaultValue={row.plannedDate ?? ""} className={`${input} mt-0.5`} />
          </label>
          <label className="text-xs">Completion Date
            <input type="date" name="completionDate" defaultValue={row.completionDate ?? ""} className={`${input} mt-0.5`} />
          </label>
          <label className="text-xs">2D &amp; 3D Link
            <input name="drawingLink" defaultValue={row.drawingLink ?? ""} placeholder="Paste URL" className={`${input} mt-0.5`} />
          </label>
          <label className="text-xs md:col-span-3">Reasons (if On Hold)
            <input name="reasons" defaultValue={row.reasons ?? ""} className={`${input} mt-0.5`} />
          </label>
          <div className="flex gap-2 md:col-span-3">
            <button className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: "#1e40af" }}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-[var(--color-hairline-strong)] px-3 py-1.5 text-xs font-semibold">Cancel</button>
          </div>
        </form>
      </td>
    </tr>
  );
}
