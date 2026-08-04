"use client";
import * as React from "react";
import { ChevronDown } from "lucide-react";

/**
 * Pill-card filter trigger: a tinted icon badge, a two-line value/sublabel, and
 * a chevron. Used as the `asChild` trigger for each filter's Popover/dropdown.
 * forwardRef so Radix can attach its trigger props.
 */
export const FilterPill = React.forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    /** The filter's name — small sublabel under the value (e.g. "Status").
     *  Omit it to show a single compact line (just the icon + value). */
    name?: string;
    /** The current value summary (e.g. "High & Medium", "All Clients"). */
    value: string;
    /** Accent for the badge + value when a selection is active. Defaults to Ehara Engineering red. */
    tint?: string;
    /** True when this filter has a non-default selection. */
    active?: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function FilterPill(
  { icon, name, value, tint = "var(--color-brand-blue)", active = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-active={active}
      aria-label={name ? `${name}: ${value}` : value}
      className={`filter-pill ${className ?? ""}`}
      {...props}
    >
      {/* Single line: icon, value, chevron.
          The pill used to stack the value over its NAME ("All Priorities" above
          "Priority"), with a 34px icon tile — roughly 52px tall, which is what
          pushed the filter bar onto two rows. The value already says which
          filter it is, so the sublabel was the same word twice at the cost of
          the whole row. `name` is kept in the API for the aria-label only. */}
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{ color: active ? tint : "var(--color-ink-subtle)" }}
        aria-hidden
      >
        {icon}
      </span>
      <span
        className="truncate max-w-[150px] text-[13px] font-semibold"
        style={{ color: "var(--color-ink-strong)" }}
      >
        {value}
      </span>
      <ChevronDown size={14} className="text-ink-subtle shrink-0" />
    </button>
  );
});

/** Summarise a multi-select for the pill's value line: "All X" / "A & B" / "N selected". */
export function summarizeSelection(labels: string[], allWord: string): string {
  if (labels.length === 0) return allWord;
  if (labels.length <= 2) return labels.join(" & ");
  return `${labels.length} selected`;
}
