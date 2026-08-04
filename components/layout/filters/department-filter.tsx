"use client";
import * as React from "react";
import { Users2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { FilterPill, summarizeSelection } from "./filter-pill";

export function DepartmentFilter({
  selected,
  onChange,
  options,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  /** Department names straight from the DB — whatever /admin/departments holds.
   *  Previously a hardcoded list in db/enums.ts that drifted from reality. */
  options: string[];
}) {
  const items = React.useMemo(
    () => options.map((d) => ({ value: d, label: d })),
    [options],
  );

  return (
    <MultiSelect
      openOnHover
      options={items}
      selected={selected}
      onChange={onChange}
      renderTrigger={({ selectedLabels }) => (
        <FilterPill
          icon={<Users2 size={16} strokeWidth={2} />}
          name="Department"
          value={summarizeSelection(selectedLabels, "All Departments")}
          tint="#8b5cf6"
          active={selected.length > 0}
        />
      )}
    />
  );
}
