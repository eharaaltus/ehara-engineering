import { redirect } from "next/navigation";
import type { Route } from "next";
import { LoginMosaic } from "@/components/auth/login-mosaic";
import { LoginFormCanva } from "@/components/auth/login-form-canva";
import { getCurrentEmployee } from "@/lib/auth/current";

/**
 * /login — Canva-style "jump back in" treatment (mirrors the reference login).
 *
 * Layer stack (back-to-front):
 *   1. LoginMosaic — a full-bleed, slowly-drifting wall of Ehara's own
 *      marketing posters, dimmed so the card reads clearly.
 *   2. A centred dark "modal" card carrying LoginFormCanva (real Firebase
 *      email/password auth — unchanged behaviour).
 *
 * Escapes the shared `(auth)/layout.tsx` shell with `fixed inset-0 z-50`.
 * Signed-in employees are redirected to the portal launcher.
 */
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const me = await getCurrentEmployee();
  if (me && me.isActive) redirect("/portal" as Route);

  const sp = await searchParams;
  const reason = firstString(sp["reason"]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "#0c0807" }}>
      {/* Layer 1 — drifting poster wall */}
      <LoginMosaic />

      {/* Brand pip, top-left — consistent with the app header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-7 py-5 max-md:px-5">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png?v=6" alt="Ehara Engineering" style={{ height: 28, width: "auto", filter: "drop-shadow(0 4px 12px rgba(30,64,175,0.5))" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.24em", color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-mono-display)", fontWeight: 700 }}>
            EHARA · ENGINEERING
          </span>
        </div>
        {/* Powered by Altus Corp partner mark */}
        <div className="flex items-center gap-2 max-sm:hidden" aria-label="Powered by Altus Corp">
          <span style={{ fontSize: 8.5, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono-display)", fontWeight: 700 }}>POWERED BY</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/altus-corp-logo-white.png?v=6" alt="Altus Corp" style={{ height: 22, width: "auto", opacity: 0.85 }} />
        </div>
      </div>

      {/* Layer 2 — centred dark card */}
      <main className="relative z-20 flex h-full w-full items-center justify-center px-5 py-16">
        <div
          className="w-full max-w-[440px] px-9 py-11 max-md:px-7 max-md:py-9"
          style={{
            background: "linear-gradient(180deg, rgba(28,22,20,0.97), rgba(18,13,12,0.98))",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 22,
            boxShadow:
              "0 50px 120px -30px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.08) inset, 0 -30px 80px -50px rgba(30,64,175,0.35) inset",
          }}
        >
          {reason === "idle" && (
            <div
              role="status"
              className="mb-5 rounded-xl px-4 py-3"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.4)", color: "#FDE68A", fontSize: 13, lineHeight: 1.5 }}
            >
              You were signed out after a period of inactivity. Please sign in to continue.
            </div>
          )}
          <LoginFormCanva />
        </div>
      </main>

      {/* Bottom signature */}
      <div
        aria-hidden
        className="absolute bottom-4 left-0 right-0 z-10 text-center"
        style={{ fontSize: 10, letterSpacing: "0.24em", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono-display)", fontWeight: 600 }}
      >
        © {new Date().getFullYear()} EHARA ENGINEERING · POWERED BY ALTUS CORP
      </div>
    </div>
  );
}
