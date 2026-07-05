"use client";
import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Route } from "next";
import { Bookmark, Trash2, Plus, Check } from "lucide-react";

/**
 * Saved views — persist the CURRENT filter combination (the page's URL query
 * string) under a name so it can be re-applied in one click. Stored in
 * localStorage, scoped per page (`pathname`), so the dashboard and the tasks
 * list keep their own lists. Personal to the browser — no backend needed.
 */
interface SavedView {
  name: string;
  /** The URLSearchParams string that reproduces the view (no leading "?"). */
  search: string;
}

export function SavedViews() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = `ehara:saved-views:${pathname}`;

  const [open, setOpen] = React.useState(false);
  const [views, setViews] = React.useState<SavedView[]>([]);
  const [name, setName] = React.useState("");

  // (Re)load whenever the popover opens so it reflects saves from other tabs.
  React.useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setViews(raw ? (JSON.parse(raw) as SavedView[]) : []);
    } catch {
      setViews([]);
    }
  }, [open, storageKey]);

  function persist(next: SavedView[]) {
    setViews(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage unavailable (private mode / quota) — non-fatal */
    }
  }

  const currentSearch = searchParams.toString();

  function saveCurrent() {
    const n = name.trim();
    if (!n) return;
    // Replace any existing view with the same name (case-insensitive).
    const next = [
      ...views.filter((v) => v.name.toLowerCase() !== n.toLowerCase()),
      { name: n, search: currentSearch },
    ].sort((a, b) => a.name.localeCompare(b.name));
    persist(next);
    setName("");
  }

  function applyView(v: SavedView) {
    router.replace(`${pathname}${v.search ? `?${v.search}` : ""}` as Route);
    setOpen(false);
  }

  function removeView(n: string) {
    persist(views.filter((v) => v.name !== n));
  }

  const isActive = (v: SavedView) => v.search === currentSearch;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-[13.5px] font-semibold border border-hairline bg-surface-card text-ink-strong hover:border-hairline-strong transition-colors"
          style={{ boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
        >
          <Bookmark size={15} strokeWidth={2} className="text-ink-subtle" />
          Saved views
          {views.length > 0 && (
            <span
              className="ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
              style={{ background: "color-mix(in srgb, var(--color-brand-blue) 14%, transparent)", color: "var(--color-brand-blue)" }}
            >
              {views.length}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[100] w-72 bg-surface-card border border-hairline-strong rounded-chip p-2.5"
          style={{ boxShadow: "0 16px 40px rgba(15, 23, 42, 0.14)" }}
        >
          {/* Save the current filters */}
          <div className="flex items-center gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveCurrent();
                }
              }}
              placeholder="Name this view…"
              className="h-9 flex-1 rounded-xl border border-hairline bg-surface-soft px-2.5 text-[13.5px] text-ink-strong outline-none focus:border-brand-blue placeholder:text-ink-subtle"
            />
            <button
              type="button"
              onClick={saveCurrent}
              disabled={!name.trim()}
              className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[13.5px] font-bold text-white disabled:opacity-40"
              style={{ background: "var(--color-brand-blue)" }}
            >
              <Plus size={14} strokeWidth={2.6} /> Save
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11.5px] text-ink-subtle">
            Saves your current filters (date, status, people…) to this browser.
          </p>

          {/* Saved list */}
          <div className="mt-2 max-h-64 overflow-y-auto">
            {views.length === 0 ? (
              <p className="px-1 py-3 text-[13px] text-ink-subtle">
                No saved views yet. Set your filters above, type a name, and hit Save.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {views.map((v) => (
                  <li key={v.name} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyView(v)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-[14px] text-ink-strong hover:bg-surface-soft transition-colors"
                    >
                      {isActive(v) ? (
                        <Check size={14} strokeWidth={2.6} style={{ color: "var(--color-brand-blue)" }} className="shrink-0" />
                      ) : (
                        <Bookmark size={14} strokeWidth={2} className="shrink-0 text-ink-subtle" />
                      )}
                      <span className="truncate">{v.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeView(v.name)}
                      aria-label={`Delete view ${v.name}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle opacity-0 hover:bg-black/5 hover:text-brand-blue transition-all group-hover:opacity-100"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
