"use client";
import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { cn } from "@/lib/utils";
import { focusNextFrom } from "@/lib/focus-next";
import { useHoverOpen } from "@/lib/use-hover-open";

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  /** Optional custom trigger (e.g. a FilterPill). Receives the resolved labels
   *  of the current selection + the open state. When set, replaces the default
   *  inline button trigger entirely. Must forward props/ref (Radix asChild). */
  renderTrigger?: (state: { selectedLabels: string[]; open: boolean }) => React.ReactElement;
  /** Open on mouse hover, close shortly after the pointer leaves both the chip
   *  and the menu. Opt-in — hovering to open suits a filter bar where you skim
   *  several menus in a row, but is a nuisance in a form or dialog where a menu
   *  popping open as the pointer crosses it interrupts typing. */
  openOnHover?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "All Employees",
  className,
  renderTrigger,
  openOnHover = false,
}: MultiSelectProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const labelMap = new Map(options.map((o) => [o.value, o.label]));

  const {
    open,
    setOpen,
    setAnchor,
    setContent,
    enter: hoverEnter,
    leave: hoverLeave,
    hoverProps,
    contentDismissProps,
  } = useHoverOpen(openOnHover);

  // Resolving the trigger element is fiddly here for a reason worth recording:
  // when a caller passes `renderTrigger` (every filter chip does), the internal
  // `triggerRef` is never attached — Radix's asChild owns the child's ref, and
  // adding a second one would clobber it. So the element is tagged with a
  // per-instance id that rides through asChild as a plain data attribute, and
  // looked up from the DOM.
  //
  // The affordance the user aims at is the whole pill — icon, label, chevron —
  // which IS the button in this app (`.filter-pill`). pointerenter/leave fire
  // once for an element and all its descendants, so binding to it is enough.
  const hoverId = React.useId();
  React.useEffect(() => {
    if (!openOnHover) return;
    const host =
      document.querySelector<HTMLElement>(`[data-hover-id="${CSS.escape(hoverId)}"]`) ??
      triggerRef.current;
    if (!host) return;
    setAnchor(host);
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hoverEnter();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hoverLeave();
    };
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      setAnchor(null);
    };
  }, [openOnHover, hoverEnter, hoverLeave, setAnchor, hoverId]);

  // Tab commits the highlighted option and advances to the next field, instead
  // of just dismissing the menu (cmdk only commits on Enter / click).
  function onCommandKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const active = e.currentTarget.querySelector<HTMLElement>(
      '[cmdk-item][aria-selected="true"]',
    );
    if (!active) return;
    e.preventDefault();
    active.click();
    setOpen(false);
    requestAnimationFrame(() => focusNextFrom(triggerRef.current, e.shiftKey ? -1 : 1));
  }

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild {...hoverProps} data-hover-id={hoverId}>
        {renderTrigger ? (
          renderTrigger({
            selectedLabels: selected.map((v) => labelMap.get(v) ?? v),
            open,
          })
        ) : (
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "inline-flex items-center gap-2 min-w-40 text-chip text-ink-strong bg-transparent outline-none text-left",
            className,
          )}
        >
          <span className="flex-1 truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
                ? labelMap.get(selected[0]!) ?? "1 selected"
                : `${selected.length} selected`}
          </span>
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="text-ink-subtle hover:text-ink-strong cursor-pointer"
              aria-label="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={14} className="text-ink-subtle" />
        </button>
        )}
      </PopoverTrigger>
      {/* overflow-hidden: the inner CommandList is the single scroller — the
          PopoverContent must NOT also scroll, or you get two stacked scrollbars.
          (Same pattern subject-select / client-select already use.) */}
      {/* hoverProps here as well as on the trigger: moving the pointer off the
          chip and into the menu must re-arm the hover, or the close timer fires
          while you're inside the thing you opened. */}
      <PopoverContent
        ref={setContent}
        className="w-72 p-0 overflow-hidden"
        {...hoverProps}
        {...contentDismissProps}
      >
        <Command onKeyDown={onCommandKeyDown}>
          <CommandInput placeholder="Search…" />
          <CommandList className="max-h-64 overflow-auto">
            <CommandEmpty className="px-2 py-3 text-[15px] text-ink-subtle">
              No results.
            </CommandEmpty>
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <CommandItem
                  key={opt.value}
                  // cmdk fuzzy-matches on `value`, so search the LABEL (the name
                  // the user reads), not the opaque id. The id keeps it unique.
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => toggle(opt.value)}
                >
                  <span className="flex items-center gap-2 w-full">
                    <span
                      className={cn(
                        "size-4 rounded border border-hairline-strong flex items-center justify-center",
                        checked && "bg-ink-strong border-ink-strong",
                      )}
                    >
                      {checked && <Check size={11} className="text-white" />}
                    </span>
                    <span className="flex-1 text-ink-strong">{opt.label}</span>
                  </span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
