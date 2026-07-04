import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/current";
import { hasUnfilledWeekGoals } from "@/lib/weekly-goals/gate";
import { WeeklyGoalsFillView } from "@/components/weekly-goals/weekly-goals-fill-view";
import { getOrgSettings } from "@/lib/queries/org-settings";
import { IdleTimerClient } from "@/components/auth/idle-timer-client";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireUser();

  // Mandatory weekly-goals fill gate (design §11). Every authed page renders
  // through this layout, so a user with any un-filled current-week goal is
  // redirected to the fill screen here — direct URLs, deep links, the back
  // button and bookmarks all pass through. Applies to EVERYONE (admins and
  // super-admins included); zero bypass. The fill page lives outside this
  // (app) group so it stays reachable without an infinite redirect.
  //
  // FAIL OPEN: the gate check must never be able to take the whole app down.
  // If the DB hiccups (we've had transient pool/connection blips), we do NOT
  // gate this request rather than throw the layout for every page. The gate
  // re-applies on the next render once the DB is healthy — it's a workflow
  // nudge, not a security boundary.
  // Weekly-goals section removed — the mandatory fill gate is disabled.
  const mustFill = false;
  // Render the fill screen INLINE (not a redirect to a separate route): Vercel's
  // build for this project doesn't register newly added routes, so a redirect
  // target like /fill-weekly-goals 404'd in prod. Rendering it here — inside the
  // already-registered (app) layout — is immune to that. The form refreshes on
  // submit, this layout re-checks, and the gate drops. Every authed page passes
  // through here, so direct URLs/deep links/back button are all gated. Applies
  // to everyone incl. super-admins.
  if (mustFill) {
    return (
      <WeeklyGoalsFillView employeeId={me.id} greetingName={me.name.split(" ")[0] ?? me.name} />
    );
  }

  const settings = await getOrgSettings();
  return (
    <>
      <IdleTimerClient timeoutMinutes={settings.idleTimeoutMinutes} />
      <KeyboardShortcuts />

      {/* ── Premium ambient backdrop (fixed, behind all app content) ──
          A soft brand-tinted wash + faint dotted grid + two blurred colour
          blobs give every screen a modern SaaS depth without hurting the
          readability of cards/tables (which sit on opaque white above it). */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(30, 64, 175,0.055) 0%, rgba(250,251,252,0) 42%, rgba(225, 29, 47,0.055) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.05) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(30, 64, 175,0.12), transparent 70%)", filter: "blur(46px)" }}
        />
        <div
          className="absolute right-[-10rem] top-1/3 h-[560px] w-[560px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(225, 29, 47,0.10), transparent 70%)", filter: "blur(54px)" }}
        />
      </div>

      {/* Faint Altus Corp watermark, fixed behind all app content */}
      <img
        src="/altus-corp-logo.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none fixed bottom-10 right-10 z-0 select-none max-md:hidden"
        style={{ height: 320, width: "auto", opacity: 0.05 }}
      />
      {children}
    </>
  );
}
