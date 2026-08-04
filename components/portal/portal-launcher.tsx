"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  BookOpen,
  Factory,
  ArrowRight,
  Lock,
  type LucideIcon,
} from "lucide-react";

interface WorkspaceDef {
  key: string;
  title: string;
  desc: string;
  tag: string;
  icon: LucideIcon;
  /** Light pastel card gradient. */
  bg1: string;
  bg2: string;
  /** Deep ink used for icon, title + tag (reads crisply on the pastel). */
  ink: string;
  /** Solid "Enter" button gradient. */
  btnA: string;
  btnB: string;
  /** Soft coloured drop-shadow / hover ring. */
  glow: string;
  href: Route;
  adminOnly?: boolean;
  /** Placement on the desktop 6-column grid (3 up top, 2 centred below). */
  lg: string;
}

const WORKSPACES: WorkspaceDef[] = [
  {
    key: "wms",
    title: "WMS",
    desc: "Tasks, projects & the daily loop.",
    tag: "Operations",
    href: "/" as Route,
    icon: LayoutDashboard,
    bg1: "#eef4ff", bg2: "#d3e2ff", ink: "#173e94", btnA: "#2f6bf6", btnB: "#1c46c0", glow: "rgba(47,107,246,0.34)",
    lg: "lg:col-span-2",
  },
  {
    key: "npd",
    title: "NPD",
    desc: "6-stage, 36-activity NPD tracker.",
    tag: "Engineering",
    href: "/npd" as Route,
    icon: Factory,
    bg1: "#ecfdf3", bg2: "#c6f1d8", ink: "#0f6f38", btnA: "#17b866", btnB: "#0d8a49", glow: "rgba(23,184,102,0.32)",
    adminOnly: true,
    lg: "lg:col-span-2",
  },
  {
    key: "admin",
    title: "Admin",
    desc: "Control room & master data.",
    tag: "Control",
    href: "/portal/admin" as Route,
    icon: ShieldCheck,
    bg1: "#f2f1ff", bg2: "#dbd4ff", ink: "#4a2fb0", btnA: "#7c5cf0", btnB: "#5b34c9", glow: "rgba(124,92,240,0.32)",
    adminOnly: true,
    lg: "lg:col-span-2",
  },
  {
    key: "employees",
    title: "Employees",
    desc: "Attendance, leave, salary & roster.",
    tag: "People",
    href: "/portal/employees" as Route,
    icon: Users,
    bg1: "#fff0f4", bg2: "#ffd2dd", ink: "#ab1f45", btnA: "#f4476a", btnB: "#c81d48", glow: "rgba(244,71,106,0.32)",
    lg: "lg:col-span-2 lg:col-start-2",
  },
  {
    // Must match the ModuleId in lib/nav-modules.ts — the portal looks the
    // resolved grant up by this key.
    key: "manual",
    title: "User Manual",
    desc: "Guides, walkthroughs & videos.",
    tag: "Reference",
    href: "/user-manual" as Route,
    icon: BookOpen,
    bg1: "#ecfbfe", bg2: "#c5ecf6", ink: "#0a7186", btnA: "#10b6cf", btnB: "#0a86a0", glow: "rgba(16,182,207,0.32)",
    lg: "lg:col-span-2",
  },
];

/** Time-aware greeting + subline. Computed on the client (server has no tz),
 *  so both first renders agree on `null` and there's no hydration mismatch. */
function useGreeting() {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hour = now?.getHours() ?? -1;
  const bucket = hour < 0 ? null : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const greeting = bucket ? `Good ${bucket}` : "Welcome back";
  const subline =
    bucket === "morning"
      ? "A fresh sheet. Pick where the day starts."
      : bucket === "afternoon"
        ? "Mid-run — jump back into the work."
        : bucket === "evening"
          ? "Wrapping up late? Thank you for the dedication."
          : "Pick a workspace to jump into.";
  return { now, greeting, subline };
}

export function PortalLauncher({
  firstName,
  isAdmin,
  allowed,
  denied,
  userMenu,
}: {
  name: string;
  firstName: string;
  isAdmin: boolean;
  /** Resolved per-module access. Absent (older callers) = fall back to the
   *  legacy adminOnly flag so nothing breaks mid-rollout. */
  allowed?: Record<string, boolean>;
  /** Set when the person was bounced here by the module guard. */
  denied?: string | null;
  /** The avatar menu (Admin panel / Profile / Documents / Inbox / Archived /
   *  Sign out), rendered on the server and slotted in — this component is a
   *  client component and can't await its data. */
  userMenu?: React.ReactNode;
}) {
  const { now, greeting, subline } = useGreeting();

  const deniedLabel = denied
    ? WORKSPACES.find((w) => w.key === denied)?.title ?? denied
    : null;

  const clock = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const dateLabel = now
    ? now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })
    : "";

  return (
    // Pinned to the viewport → never scrolls on desktop; the grid fills the
    // leftover height so every button stays visible at any zoom.
    <div
      className="portal-root relative isolate flex h-dvh flex-col overflow-hidden max-md:h-auto max-md:min-h-dvh max-md:overflow-visible"
      style={{ background: "#eef3fb" }}
    >
      <PortalStyles />

      {/* ── light background: soft wash + pastel aurora + faint blueprint grid ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% -10%, #ffffff 0%, #eef3fb 46%, #e6edf8 100%)" }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,36,92,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(20,36,92,0.045) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
            maskImage: "radial-gradient(125% 100% at 50% 0%, #000 48%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(125% 100% at 50% 0%, #000 48%, transparent 100%)",
          }}
        />
        <div className="portal-orb absolute -left-36 -top-36 h-[40vw] max-h-[520px] w-[40vw] max-w-[520px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(47,107,246,0.18), transparent)" }} />
        <div className="portal-orb portal-orb--b absolute -top-24 right-[8%] h-[32vw] max-h-[440px] w-[32vw] max-w-[440px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(124,92,240,0.16), transparent)" }} />
        <div className="portal-orb portal-orb--c absolute bottom-[-16%] left-[10%] h-[36vw] max-h-[480px] w-[36vw] max-w-[480px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(244,71,106,0.13), transparent)" }} />
        <div className="portal-orb portal-orb--b absolute bottom-[-18%] right-[14%] h-[34vw] max-h-[460px] w-[34vw] max-w-[460px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(16,182,207,0.15), transparent)" }} />
      </div>

      {/* ── top bar ── */}
      <header className="portal-fade relative z-10 mx-auto flex w-full max-w-[1320px] shrink-0 items-center justify-between gap-4 px-9 py-2.5 max-md:px-4">
        <Link href={"/" as Route} className="group flex items-center gap-3" aria-label="Ehara Engineering">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png?v=6" alt="" className="h-12 w-12 transition-transform duration-300 group-hover:scale-105" />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-black tracking-[-0.01em]" style={{ color: "#14245c" }}>Ehara Engineering</span>
            <span className="mt-0.5 text-[8.5px] font-black uppercase tracking-[0.26em]" style={{ color: "#e11d2f" }}>Workspaces</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 max-md:gap-2">
          <div className="flex flex-col items-end leading-none max-sm:hidden" style={{ fontFamily: "var(--font-mono-display), ui-monospace, monospace" }}>
            <span className="text-[14px] font-bold tabular-nums" style={{ color: "#14245c" }} suppressHydrationWarning>{clock || "—"}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400" suppressHydrationWarning>{dateLabel || "Ehara"}</span>
          </div>
          <span className="h-8 w-px bg-slate-300/70 max-sm:hidden" aria-hidden />
          <span className="text-[13px] text-slate-500 max-sm:hidden">Hi, <b className="text-slate-900">{firstName}</b></span>
          {/* The avatar menu carries Admin panel, Profile & preferences,
              Documents / Inbox / Archived and Sign out — so the standalone
              "Sign out" button that used to sit here was the same action twice,
              and the portal had no route to the admin panel or the profile at
              all without first entering a workspace. */}
          {userMenu}
          <span className="mx-0.5 h-8 w-px bg-slate-300/70 max-lg:hidden" aria-hidden />
          <span className="flex flex-col items-center gap-1 leading-none max-lg:hidden" aria-label="Powered by Altus Corp">
            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">Powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/altus-corp-logo.png?v=6" alt="Altus Corp" className="h-11 w-auto" />
          </span>
        </div>
      </header>

      {/* ── hero (compact, centred) ── */}
      <div className="portal-fade relative z-10 mx-auto flex w-full max-w-[1320px] shrink-0 flex-col items-center px-9 pt-1 pb-1 text-center max-md:px-4" style={{ animationDelay: "80ms" }}>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#2f6bf6]/15 bg-white/70 px-3.5 py-1.5 shadow-sm backdrop-blur" style={{ fontFamily: "var(--font-mono-display), ui-monospace, monospace" }}>
          <span className="portal-pulse size-1.5 rounded-full" style={{ background: "linear-gradient(135deg,#2f6bf6,#12b6cf)", boxShadow: "0 0 8px rgba(47,107,246,0.6)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#2f6bf6" }}>Ehara Engineering · Workspaces</span>
        </span>
        <h1
          className="mt-2"
          style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(22px, 2.3vw, 34px)",
            letterSpacing: "-0.035em",
            lineHeight: 1,
            color: "#101a33",
          }}
        >
          {greeting}, <span className="hero-name">{firstName}</span>
        </h1>
        <div className="hero-rule mx-auto mt-2.5 rounded-full" aria-hidden />
        <p className="mt-2 text-[14px] font-medium text-slate-500">{subline}</p>
      </div>

      {/* ── card grid — fills the remaining height; nothing scrolls, nothing clips ── */}
      <main className="relative z-10 mx-auto w-full min-h-0 max-w-[1320px] flex-1 px-9 pb-3 pt-2 max-md:px-4 max-md:pb-6">
        {deniedLabel && (
          <div
            className="mb-3 rounded-xl px-4 py-2.5 text-[13px] font-semibold"
            style={{ background: "rgba(225,29,47,0.10)", color: "#a8121f", border: "1px solid rgba(225,29,47,0.25)" }}
            role="alert"
          >
            You don’t have access to <b>{deniedLabel}</b>. Ask an admin to open it for you.
          </div>
        )}
        <div className="grid h-full min-h-0 grid-cols-2 grid-rows-3 gap-4 lg:grid-cols-6 lg:grid-rows-2 max-sm:h-auto max-sm:grid-cols-1 max-sm:grid-rows-none max-sm:auto-rows-[minmax(160px,1fr)]">
          {WORKSPACES.map((w, i) => {
            // Prefer the resolved grant; fall back to the legacy adminOnly flag
            // for the tiles that aren't access-controlled modules (Admin).
            const locked =
              allowed && w.key in allowed
                ? !allowed[w.key]
                : !!w.adminOnly && !isAdmin;
            return <WorkspaceCard key={w.key} ws={w} locked={locked} index={i} />;
          })}
        </div>
      </main>

      {/* ── footer ── */}
      <footer className="portal-fade relative z-10 shrink-0 pb-2.5 pt-1 max-md:pb-5" style={{ animationDelay: "520ms" }}>
        <div className="flex items-center justify-center gap-2 opacity-70">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400" style={{ fontFamily: "var(--font-mono-display), ui-monospace, monospace" }}>
            © {now ? now.getFullYear() : ""} Ehara Engineering · Powered by Altus Corp
          </span>
        </div>
      </footer>
    </div>
  );
}

function WorkspaceCard({ ws, locked, index }: { ws: WorkspaceDef; locked: boolean; index: number }) {
  const Icon = ws.icon;

  const inner = (
    <div
      className="ws-card group/card relative flex h-full w-full min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-[24px] p-6 max-xl:p-5"
      style={{
        background: `linear-gradient(150deg, ${ws.bg1} 0%, ${ws.bg2} 100%)`,
        border: "1px solid rgba(255,255,255,0.85)",
        ["--glow" as string]: ws.glow,
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 100%)" }} />
      <Icon aria-hidden size={150} strokeWidth={1} className="ws-ghost pointer-events-none absolute -bottom-8 -right-7" style={{ color: ws.ink, opacity: 0.07 }} />

      {/* spec tag — top-right corner */}
      <span className="absolute right-6 top-6 rounded-full bg-white/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/70 backdrop-blur-sm max-xl:right-5 max-xl:top-5" style={{ fontFamily: "var(--font-mono-display), ui-monospace, monospace", color: ws.ink }}>
        {ws.tag}
      </span>

      {/* icon + aligned name / description block */}
      <div className="relative flex items-center gap-4">
        <span
          className="ws-ico inline-flex size-[56px] shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/80 backdrop-blur-sm max-xl:size-[50px]"
          style={{ background: "rgba(255,255,255,0.78)", color: ws.ink, boxShadow: `0 2px 5px rgba(15,23,42,0.12), 0 10px 22px -8px ${ws.glow}, inset 0 1.5px 0 rgba(255,255,255,1)` }}
        >
          <Icon size={29} strokeWidth={2.15} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[23px] font-black leading-tight tracking-[-0.02em] max-xl:text-[21px]" style={{ color: ws.ink }}>
            {ws.title}
          </h2>
          <p className="mt-1 truncate text-[12.5px] font-semibold" style={{ color: ws.ink, opacity: 0.68 }}>{ws.desc}</p>
        </div>
      </div>

      {/* action */}
      <div className="relative mt-5">
        {locked ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/70 px-3.5 text-[12.5px] font-bold ring-1 ring-black/5" style={{ color: ws.ink }}>
            <Lock size={13} strokeWidth={2.5} /> Admin only
          </span>
        ) : (
          <span
            className="ws-cta inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-extrabold text-white transition-all duration-200 group-hover/card:gap-2.5"
            style={{ background: `linear-gradient(135deg, ${ws.btnA}, ${ws.btnB})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 0 rgba(0,0,0,0.16), 0 10px 22px -8px ${ws.glow}` }}
          >
            Enter workspace
            <ArrowRight size={15} strokeWidth={2.8} />
          </span>
        )}
      </div>
    </div>
  );

  const style = { animationDelay: `${index * 80}ms` } as React.CSSProperties;

  if (locked) {
    return (
      <div className={"ws-link ws-link--static flex min-h-0 " + ws.lg} style={style} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={ws.href}
      style={style}
      className={"ws-link group flex min-h-0 rounded-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f6bf6] " + ws.lg}
    >
      {inner}
    </Link>
  );
}

/** Scoped animation layer. Prefixed class names (portal-/ws-/hero-) avoid
 *  colliding with the app's global CSS. All motion respects reduced-motion. */
function PortalStyles() {
  return (
    <style>{`
      @keyframes portalRise { from { opacity: 0; transform: translateY(18px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes portalFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .portal-fade { animation: portalFade .6s cubic-bezier(.2,.7,.2,1) both; }

      /* card entrance + springy POP on hover (rises above neighbours) */
      .ws-link { position: relative; animation: portalRise .6s cubic-bezier(.2,.7,.2,1) both; will-change: transform; transition: transform .34s cubic-bezier(.34,1.56,.64,1); }
      .ws-link:not(.ws-link--static):hover { transform: translateY(-9px) scale(1.035); z-index: 20; }

      /* layered depth: inner top highlight + inner bottom curvature shade,
         then contact / mid / ambient-colour drop shadows = a raised 3D panel */
      .ws-card {
        box-shadow:
          inset 0 1.5px 0 rgba(255,255,255,.85),
          inset 0 -22px 36px -26px rgba(15,23,42,.16),
          0 2px 4px rgba(15,23,42,.07),
          0 12px 22px -10px rgba(15,23,42,.16),
          0 30px 54px -26px var(--glow);
        transition: box-shadow .4s ease;
      }
      .ws-link:hover .ws-card {
        box-shadow:
          inset 0 1.5px 0 rgba(255,255,255,.95),
          inset 0 -22px 40px -28px rgba(15,23,42,.14),
          0 4px 8px rgba(15,23,42,.10),
          0 22px 36px -12px rgba(15,23,42,.2),
          0 56px 88px -28px var(--glow),
          0 0 0 1.5px rgba(255,255,255,.9);
      }

      .ws-ico { transition: transform .34s cubic-bezier(.34,1.56,.64,1); }
      .ws-link:hover .ws-ico { transform: translateY(-3px) scale(1.08); }
      .ws-ghost { transition: transform .55s cubic-bezier(.2,.7,.2,1); }
      .ws-link:hover .ws-ghost { transform: translate(-6px,-6px) scale(1.1) rotate(4deg); }
      .ws-cta { will-change: transform; }

      /* hero: multicolour shimmering first name */
      .hero-name {
        background: linear-gradient(95deg, #2b6bf6, #14245c);
        -webkit-background-clip: text; background-clip: text;
        color: transparent; -webkit-text-fill-color: transparent;
      }

      .hero-rule { width: 64px; height: 4px; background: linear-gradient(90deg,#1e40af,#e11d2f); box-shadow: 0 4px 14px rgba(30,64,175,.4); animation: heroRule .9s cubic-bezier(.2,.7,.2,1) .25s both; }
      @keyframes heroRule { from { width: 0; opacity: 0; } to { width: 64px; opacity: 1; } }

      .portal-pulse { animation: portalPulse 2.4s ease-in-out infinite; }
      @keyframes portalPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(.82); } }

      .portal-orb { filter: blur(48px); animation: orbDrift 22s ease-in-out infinite; will-change: transform; }
      .portal-orb--b { animation-duration: 28s; }
      .portal-orb--c { animation-duration: 25s; }
      @keyframes orbDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(26px,-22px) scale(1.06); } }

      @media (prefers-reduced-motion: reduce) {
        .portal-fade, .ws-link, .ws-card, .hero-name, .hero-rule, .portal-orb, .portal-pulse, .ws-ico, .ws-ghost {
          animation: none !important; transition: none !important;
        }
        .ws-link:not(.ws-link--static):hover { transform: none; }
        .hero-name { background-position: 0 center; }
      }
    `}</style>
  );
}
