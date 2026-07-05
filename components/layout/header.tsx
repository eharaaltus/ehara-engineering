import { LayoutGrid } from "lucide-react";
import { MainNavServer } from "./main-nav-server";
import { EmployeesNav } from "./employees-nav";
import { MobileMenuServer } from "./mobile-menu-server";
import { HeaderStatusBar } from "./header-clock";
import { UserMenuServer } from "@/components/header/user-menu-server";
import { NewTaskTrigger } from "@/components/header/new-task-trigger";
import { AdminPill } from "@/components/header/admin-pill";
import { GlobalSearch } from "@/components/header/global-search";
import { getCurrentEmployee } from "@/lib/auth/current";

/**
 * Command-center application header.
 *
 *  1. HERO CARD (scrolls away): a wide, fully-rounded glass card with a
 *     dark-blue→green gradient and a soft outer glow. Ehara Engineering mark in a glass
 *     tile on the left; the "Anant Avinya Technologies" wordmark + tagline +
 *     a live status-pill bar (date · time · system · modules) in the center;
 *     the "Powered by Altus Corp" partner mark on the right.
 *  2. NAV BAR (sticky): the primary pill nav + search + actions + avatar on a
 *     light frosted strip. `.header-light` keeps the nav pills ink-on-light.
 *
 * `generatedAt` is accepted to keep the prop contract stable for callers but
 * no longer rendered.
 */
export async function DashboardHeader({
  generatedAt: _generatedAt,
  workspace = "wms",
}: { generatedAt: Date; workspace?: "wms" | "employees" }) {
  const me = await getCurrentEmployee();
  const isAdmin = me?.isAdmin ?? false;
  const isEmployees = workspace === "employees";
  const moduleCount = isEmployees ? 4 : 6 + (isAdmin ? 1 : 0); // primary nav modules in reach
  // Back-link target for the "Workspace" wayfinding button.
  const workspaceHref = isEmployees ? "/portal/employees" : "/portal";

  return (
    <header className="header-light">
      {/* ─────────────── HERO COMMAND CARD (light) ─────────────── */}
      <div className="px-4 pt-4 max-md:px-3 max-md:pt-3">
        <div className="relative mx-auto max-w-[1760px]">
          {/* soft outer glow */}
          <div
            aria-hidden
            className="absolute -inset-1 rounded-[34px] opacity-25 blur-2xl"
            style={{ background: "linear-gradient(105deg, #1e40af 0%, #2b55c4 50%, #e11d2f 100%)" }}
          />

          {/* the card */}
          <div
            className="relative overflow-hidden rounded-[26px] border border-white/80"
            style={{
              background: "linear-gradient(115deg, #e9f3fd 0%, #ffffff 46%, #fdecef 100%)",
              boxShadow: "0 26px 60px -34px rgba(15,60,100,0.28), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            {/* decorative backdrop */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.6]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.06) 1px, transparent 0)", backgroundSize: "26px 26px" }} />
              <div className="hero-anim absolute -left-24 -top-28 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(30, 64, 175,0.18), transparent 68%)", filter: "blur(30px)", animation: "heroFloat1 18s ease-in-out infinite" }} />
              <div className="hero-anim absolute right-[-4rem] -bottom-32 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(225, 29, 47,0.16), transparent 68%)", filter: "blur(34px)", animation: "heroFloat2 22s ease-in-out infinite" }} />
            </div>

            <div className="relative flex items-center justify-between gap-6 px-8 py-5 max-md:px-4 max-md:py-4 max-md:gap-3">
              {/* LEFT — logo (no tile) */}
              <a
                href="/"
                aria-label="Ehara Engineering home"
                className="group relative flex shrink-0 flex-col items-center justify-center transition-transform hover:scale-[1.05]"
              >
                <img src="/logo-mark.png?v=6" alt="Ehara Engineering" className="relative h-16 w-auto max-md:h-12" style={{ display: "block", filter: "drop-shadow(0 6px 14px rgba(30, 64, 175,0.3))" }} />
                <span className="relative mt-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-700 max-md:text-[9px]">Ehara Engineering</span>
              </a>

              {/* CENTER — wordmark + tagline + status pills */}
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <h1
                  className="truncate max-w-full"
                  style={{
                    fontFamily: "var(--font-display), system-ui, sans-serif",
                    fontWeight: 900,
                    fontSize: "clamp(20px, 2.5vw, 33px)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    background: "linear-gradient(95deg, #14245c 0%, #1e40af 45%, #e11d2f 100%)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                    animation: "headerTextShimmer 7s linear infinite",
                  }}
                >
                  Ehara Engineering
                </h1>
                <div className="mt-3.5 max-md:mt-2.5">
                  <HeaderStatusBar moduleCount={moduleCount} />
                </div>
              </div>

              {/* RIGHT — powered by Altus Corp (no chip) */}
              <div className="flex shrink-0 flex-col items-center gap-1.5 max-lg:hidden" aria-label="Powered by Altus Corp">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Powered by</span>
                <img
                  src="/altus-corp-logo.png?v=6"
                  alt="Altus Corp"
                  className="h-[68px] w-auto max-md:h-14"
                  style={{ display: "block", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────── FUNCTIONAL NAV BAR ─────────────── */}
      {/* Not sticky: it lives inside the short <header>, so a sticky here can't
          escape it anyway (it scrolled away and left a gap above the filter),
          and its z-50 was overlapping the sticky FilterBar and eating clicks on
          the far-right actions (Saved views). The FilterBar is the single bar
          that freezes at top-0; the nav scrolls away with the hero. */}
      <div
        className="relative z-30 mt-3"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderTop: "1px solid var(--color-hairline)",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        <div className="relative w-full h-[62px] px-6 max-md:h-[58px] max-md:px-4 flex items-center gap-4 2xl:gap-6 max-md:gap-3">
          <MobileMenuServer isAdmin={isAdmin} workspace={workspace} />

          {/* Wayfinding — jump to the workspace picker. Replaces the old
              floating back/forward arrows. */}
          <div className="flex items-center gap-1.5 shrink-0 max-md:hidden">
            <a
              href={workspaceHref}
              title="Go to Workspaces"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 px-3 text-[13px] font-bold text-slate-600 transition-all hover:-translate-y-0.5 hover:border-[#1e40af]/40 hover:bg-white hover:text-[#14245c]"
            >
              <LayoutGrid size={15} strokeWidth={2.5} /> Workspace
            </a>
            <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
          </div>

          <div className="flex-1 min-w-0 overflow-x-auto nav-scroll max-md:hidden">
            <div className="flex w-max mx-auto">
              {isEmployees ? <EmployeesNav /> : <MainNavServer />}
            </div>
          </div>

          <div className="flex items-center gap-2.5 2xl:gap-3 shrink-0 max-xl:ml-auto max-md:gap-1.5">
            <GlobalSearch />
            <NewTaskTrigger />
            {isAdmin && (
              <span className="max-2xl:hidden">
                <AdminPill />
              </span>
            )}
            <UserMenuServer />
          </div>
        </div>
      </div>
    </header>
  );
}
