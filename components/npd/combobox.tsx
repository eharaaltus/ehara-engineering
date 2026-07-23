"use client";

/**
 * A single-select dropdown with a built-in search box.
 *
 * The plain <select> is fine for six customers and miserable for sixty — you
 * can't type to find one. This looks like the other filter pills but opens a
 * searchable list, so "which of our forty M&M variants" is two keystrokes, not a
 * scroll. Falls back to showing everything when the search is empty.
 */

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  widthClass = "min-w-[160px]",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ComboOption[];
  placeholder: string;
  searchPlaceholder?: string;
  widthClass?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] font-bold shadow-sm outline-none transition hover:border-[var(--color-brand-blue)] focus:border-[var(--color-brand-blue)] ${widthClass}`}
          style={{ color: selected ? "var(--color-ink-strong)" : "var(--color-ink-subtle)" }}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown size={15} className="shrink-0 text-ink-subtle" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0" sideOffset={6}>
        <Command
          filter={(val, search) => {
            // Match on the visible label, not the id we store as the item value.
            const opt = options.find((o) => o.value === val);
            const hay = `${opt?.label ?? ""} ${opt?.hint ?? ""}`.toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <div className="flex items-center gap-1.5 px-2.5 pt-1">
            <Search size={14} className="text-ink-subtle" />
            <CommandInput placeholder={searchPlaceholder ?? "Search…"} className="h-10 border-0" />
          </div>
          <CommandList className="max-h-[280px] overflow-y-auto py-1">
            <CommandEmpty className="px-3 py-4 text-center text-[13px] text-ink-subtle">No match.</CommandEmpty>
            <CommandItem
              value="__all__"
              onSelect={() => { onChange(""); setOpen(false); }}
              className="flex items-center gap-2"
            >
              <span className="w-[14px]">{value === "" && <Check size={14} className="text-[var(--color-brand-blue)]" />}</span>
              <span className="font-semibold text-ink-muted">{placeholder}</span>
            </CommandItem>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={o.value}
                onSelect={() => { onChange(o.value); setOpen(false); }}
                className="flex items-center gap-2"
              >
                <span className="w-[14px]">{value === o.value && <Check size={14} className="text-[var(--color-brand-blue)]" />}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink-strong">{o.label}</span>
                {o.hint && <span className="shrink-0 text-[11px] text-ink-subtle">{o.hint}</span>}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
