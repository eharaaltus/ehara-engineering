"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Floating browser-style back / forward navigation, pinned top-left and layered
 * above content and popups so it stays reachable everywhere. Mirrors browser
 * history via the router.
 */
export function NavArrows() {
  const router = useRouter();
  const btn =
    "group inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:bg-[#1e40af]/12 hover:text-[#14245c] active:scale-90";
  return (
    <div
      className="fixed left-4 top-4 z-[130] flex items-center gap-0.5 rounded-full border border-white/80 bg-white/85 p-1 shadow-[0_14px_34px_-10px_rgba(15,40,80,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl print:hidden max-md:left-3 max-md:top-3"
    >
      {/* soft brand sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-60"
        style={{ background: "linear-gradient(120deg, rgba(30, 64, 175,0.06), rgba(255,255,255,0) 55%, rgba(225, 29, 47,0.07))" }}
      />
      <button type="button" onClick={() => router.back()} aria-label="Go back" title="Back" className={btn}>
        <ChevronLeft size={19} strokeWidth={2.7} className="relative transition-transform group-hover:-translate-x-0.5" />
      </button>
      <span className="relative h-4 w-px rounded-full bg-gradient-to-b from-transparent via-slate-300 to-transparent" aria-hidden />
      <button type="button" onClick={() => router.forward()} aria-label="Go forward" title="Forward" className={btn}>
        <ChevronRight size={19} strokeWidth={2.7} className="relative transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
