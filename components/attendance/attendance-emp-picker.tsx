"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";

/**
 * Admin-only: choose whose monthly attendance calendar to view. Navigates to
 * ?emp=<id>&month=<month>; the empty value means "my own".
 */
export function AttendanceEmpPicker({
  employees,
  selected,
  month,
  selfId,
}: {
  employees: { id: string; name: string }[];
  selected: string;
  month: string;
  selfId: string;
}) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-2 text-[13px] text-ink-subtle">
      Viewing
      <select
        value={selected}
        onChange={(e) => {
          const id = e.target.value;
          const emp = id === selfId ? "" : id;
          router.push(`/attendance?month=${month}${emp ? `&emp=${emp}` : ""}` as Route);
        }}
        className="rounded-lg border border-hairline-strong bg-surface-card px-2.5 py-1.5 text-[13px] font-semibold text-ink-strong outline-none focus:border-brand-blue"
      >
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.id === selfId ? `${e.name} (me)` : e.name}
          </option>
        ))}
      </select>
    </label>
  );
}
