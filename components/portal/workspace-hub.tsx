"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  ShieldCheck,
  Database,
  CalendarCheck,
  CalendarMinus,
  Wallet,
  Receipt,
  ArrowRight,
  ArrowLeft,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { LoginMosaic } from "@/components/auth/login-mosaic";
import { NavArrows } from "@/components/layout/nav-arrows";

// Icons are referenced by string key so a server page can pass plain data.
const ICONS: Record<string, LucideIcon> = {
  shield: ShieldCheck,
  database: Database,
  attendance: CalendarCheck,
  leave: CalendarMinus,
  wallet: Wallet,
  receipt: Receipt,
};

export interface HubOption {
  label: string;
  desc: string;
  href: string;
  icon: string;
}

export function WorkspaceHub({
  title,
  subtitle,
  from,
  to,
  options,
}: {
  title: string;
  subtitle: string;
  from: string;
  to: string;
  options: HubOption[];
}) {
  const router = useRouter();

  async function signOutNow() {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      /* server revoke below is what matters */
    }
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/login" as Route);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0807]">
      <NavArrows />
      {/* poster-wall backdrop — same as the portal / sign-in */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <LoginMosaic overlay="soft" />
      </div>

      {/* ── header (premium dark glass) ── */}
      <div className="relative z-10 px-6 pt-6 max-md:px-3">
        <div className="relative mx-auto max-w-[1180px]">
          <div aria-hidden className="absolute -inset-[3px] rounded-[26px] opacity-45 blur-2xl" style={{ background: "linear-gradient(110deg, #0180cf, #0a7d8a 52%, #63b81e)" }} />
          <header
            className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[22px] px-6 py-4 backdrop-blur-2xl max-md:px-4"
            style={{
              background: "linear-gradient(180deg, rgba(26,21,20,0.90), rgba(14,11,10,0.95))",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 34px 80px -34px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -40px 70px -55px rgba(1,128,207,0.5)",
            }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg, #0180cf, #0069b3 45%, #63b81e)", backgroundSize: "200% auto", animation: "headerTextShimmer 7s linear infinite" }} />

            <Link href={"/portal" as Route} className="group relative flex items-center gap-3 shrink-0" aria-label="A A Tech workspaces">
              <span className="inline-flex items-center justify-center rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-white/25 transition-transform group-hover:scale-105">
                <img src="/logo-mark.png?v=3" alt="A A Tech" className="h-9 w-auto" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[16px] font-black tracking-[-0.01em] text-white">A A Tech</span>
                <span className="text-[9px] font-black uppercase tracking-[0.24em] text-[#7ed957]">Workspaces</span>
              </span>
            </Link>

            <div className="relative flex items-center gap-2.5">
              <Link
                href={"/portal" as Route}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3.5 text-[13px] font-bold text-white/90 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
              >
                <ArrowLeft size={14} strokeWidth={2.4} /> Workspaces
              </Link>
              <button
                type="button"
                onClick={signOutNow}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3.5 text-[13px] font-bold text-white/90 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20 hover:text-white max-sm:hidden"
              >
                <LogOut size={14} strokeWidth={2.4} /> Sign out
              </button>
              <span className="h-8 w-px bg-white/15 max-lg:hidden" aria-hidden />
              <span className="flex flex-col items-center gap-1 leading-none max-lg:hidden" aria-label="Powered by Altus Corp">
                <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/50">Powered by</span>
                <span className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-1.5 shadow-lg ring-1 ring-white/40">
                  <img src="/altus-corp-logo.png?v=2" alt="Altus Corp" className="h-11 w-auto" />
                </span>
              </span>
            </div>
          </header>
        </div>
      </div>

      {/* ── content ── */}
      <main className="relative z-10 mx-auto max-w-[1180px] px-8 pb-20 pt-4 max-md:px-4">
        <div className="mb-8 max-md:mb-6">
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#5cc0f5]">
            A A Tech <span className="text-white/30">/</span> {title}
          </div>
          <h1
            className="mt-1.5 text-white"
            style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 3.6vw, 42px)", letterSpacing: "-0.03em", lineHeight: 1.03, textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}
          >
            {title}
          </h1>
          <p className="mt-1.5 text-[15px] text-white/70">{subtitle}</p>
        </div>

        {/* options on a black stage */}
        <div className="rounded-[30px] border border-white/10 bg-black/70 p-5 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm max-md:p-3.5">
          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            {options.map((o) => {
              const Icon = ICONS[o.icon] ?? ShieldCheck;
              return (
                <Link
                  key={o.label}
                  href={o.href as Route}
                  className="group relative flex items-center gap-5 overflow-hidden rounded-[22px] p-6 shadow-lg transition-all duration-200 hover:-translate-y-1 max-sm:gap-4"
                  style={{ background: `linear-gradient(145deg, ${from}, ${to})`, boxShadow: `0 22px 46px -22px ${to}cc` }}
                >
                  <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 42%)" }} />
                  <span className="relative inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm transition-transform group-hover:scale-105 max-sm:size-14">
                    <Icon size={28} strokeWidth={2.2} />
                  </span>
                  <div className="relative flex min-w-0 flex-1 flex-col">
                    <h2 className="text-[22px] font-black leading-none tracking-[-0.01em] text-white">{o.label}</h2>
                    <p className="mt-2 text-[13.5px] font-medium leading-snug text-white/85">{o.desc}</p>
                    <span className="mt-4 inline-flex h-9 w-fit items-center gap-1.5 rounded-lg bg-white px-4 text-[13.5px] font-extrabold shadow-sm transition-transform group-hover:translate-x-0.5" style={{ color: to }}>
                      Open <ArrowRight size={15} strokeWidth={2.7} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
