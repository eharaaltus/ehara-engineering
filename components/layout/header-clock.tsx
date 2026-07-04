"use client";

import * as React from "react";
import { CalendarDays, Clock, LayoutGrid } from "lucide-react";

/**
 * Live status-pill bar for the command-center header band: date · time ·
 * system status · active-modules count. Renders placeholder dashes until
 * mounted (so SSR and client clocks never mismatch), then ticks every 30s.
 */
export function HeaderStatusBar({ moduleCount }: { moduleCount: number }) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const date = now ? now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  const time = now ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <Pill icon={<CalendarDays size={13} strokeWidth={2.3} />} text={date} />
      <Pill icon={<Clock size={13} strokeWidth={2.3} />} text={time} />
      <Pill
        icon={
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e11d2f] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#e11d2f]" />
          </span>
        }
        text="System Online"
      />
    </div>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur"
      suppressHydrationWarning
    >
      <span className="text-[#1e40af]">{icon}</span>
      <span className="text-[12px] font-semibold tabular-nums text-slate-600">{text}</span>
    </span>
  );
}
