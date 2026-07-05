"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { updateNpdTask } from "@/app/(app)/npd/actions";
import { computeNpd } from "@/lib/npd/status";

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

const ctrl =
  "rounded-lg border border-[var(--color-hairline-strong)] bg-[var(--color-surface-card)] px-2 py-1 text-xs outline-none focus:border-[#1e40af]";

/**
 * Inline-editable NPD activity row — every field (Doer, Planned, Status, Link)
 * edits in place and auto-saves on change/blur (like the Tasks tab), no Edit
 * button. The ⌄ expander reveals the less-frequent fields (Applicability,
 * Completion date, Reasons). Saves are optimistic via local state; the server
 * action revalidates the page so the product health/predicted-end update.
 */
export function NpdTaskRow({ row, employees }: { row: NpdRow; employees: Emp[] }) {
  const [doerId, setDoerId] = useState(row.doerId ?? "");
  const [plannedDate, setPlannedDate] = useState(row.plannedDate ?? "");
  const [completionDate, setCompletionDate] = useState(row.completionDate ?? "");
  const [resolution, setResolution] = useState(row.resolution);
  const [applicability, setApplicability] = useState(row.applicability);
  const [drawingLink, setDrawingLink] = useState(row.drawingLink ?? "");
  const [reasons, setReasons] = useState(row.reasons ?? "");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function save(overrides: Partial<Record<string, string>> = {}) {
    const next = {
      doerId, plannedDate, completionDate, resolution, applicability, drawingLink, reasons,
      ...overrides,
    };
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("productId", row.productId);
    fd.set("doerId", next.doerId);
    fd.set("plannedDate", next.plannedDate);
    fd.set("completionDate", next.completionDate);
    fd.set("resolution", next.resolution);
    fd.set("applicability", next.applicability);
    fd.set("drawingLink", next.drawingLink);
    fd.set("reasons", next.reasons);
    start(async () => {
      await updateNpdTask(fd);
    });
  }

  const c = computeNpd({
    plannedDate: plannedDate || null,
    resolution,
    completionDate: completionDate || null,
    applicability,
  });

  return (
    <>
      <tr
        className="border-b border-[var(--color-hairline)] align-middle last:border-0"
        style={{ opacity: pending ? 0.6 : 1, transition: "opacity 0.15s" }}
      >
        <td className="py-2 pr-2 font-mono text-xs text-[var(--color-ink-subtle)]">{row.code}</td>
        <td className="py-2 pr-2 text-sm">{row.activityPlan}</td>

        {/* Doer */}
        <td className="py-2 pr-2">
          <select
            value={doerId}
            onChange={(e) => { setDoerId(e.target.value); save({ doerId: e.target.value }); }}
            className={ctrl}
            aria-label="Doer"
          >
            <option value="">—</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </td>

        {/* Planned date */}
        <td className="py-2 pr-2">
          <input
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
            onBlur={() => plannedDate !== (row.plannedDate ?? "") && save()}
            className={ctrl}
            aria-label="Planned date"
          />
        </td>

        {/* Status (resolution) — drives the computed state pill */}
        <td className="py-2 pr-2">
          <select
            value={resolution}
            onChange={(e) => { setResolution(e.target.value); save({ resolution: e.target.value }); }}
            className={ctrl}
            aria-label="Status"
            style={{ color: stateColor[c.state], fontWeight: 700 }}
          >
            {["Open", "Done", "On Hold"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="ml-1.5 text-[11px] font-semibold" style={{ color: stateColor[c.state] }}>
            {c.label}
          </span>
        </td>

        {/* Link */}
        <td className="py-2 pr-2">
          <div className="flex items-center gap-1">
            <input
              value={drawingLink}
              onChange={(e) => setDrawingLink(e.target.value)}
              onBlur={() => drawingLink !== (row.drawingLink ?? "") && save()}
              placeholder="Paste URL"
              className={`${ctrl} w-28`}
              aria-label="2D/3D link"
            />
            {drawingLink && (
              <a href={drawingLink} target="_blank" rel="noreferrer" className="text-[#1e40af]" title="Open link">
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </td>

        {/* Expander for the rest */}
        <td className="py-2 pr-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="More fields"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-soft)]"
          >
            <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
          <td />
          <td colSpan={6} className="py-2 pr-2">
            <div className="grid gap-2 md:grid-cols-3">
              <label className="text-xs">Applicability
                <select
                  value={applicability}
                  onChange={(e) => { setApplicability(e.target.value); save({ applicability: e.target.value }); }}
                  className={`${ctrl} mt-0.5 w-full`}
                >
                  {["Applicable", "N/A", "On Hold"].map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="text-xs">Completion date
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  onBlur={() => completionDate !== (row.completionDate ?? "") && save()}
                  className={`${ctrl} mt-0.5 w-full`}
                />
              </label>
              <label className="text-xs">Reasons (if On Hold / delayed)
                <input
                  value={reasons}
                  onChange={(e) => setReasons(e.target.value)}
                  onBlur={() => reasons !== (row.reasons ?? "") && save()}
                  className={`${ctrl} mt-0.5 w-full`}
                />
              </label>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
