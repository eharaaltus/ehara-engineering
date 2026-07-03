"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { wasPasswordResetByAdmin } from "@/app/(auth)/login/actions";

function translateFirebaseError(code: string | undefined): string {
  switch (code) {
    case "auth/user-disabled":
      return "This account has been deactivated. Contact your admin to reinstate access.";
    case "auth/too-many-requests":
      return "Too many attempts — wait a minute, then try again.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Wrong password. Try again, or reset it below.";
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "We couldn't find that email. Check the address your admin set up.";
    case "auth/network-request-failed":
      return "Network hiccup. Check your connection and try again.";
    default:
      return "Email or password didn't match. Try again.";
  }
}

async function exchangeIdTokenForSession(idToken: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (res.ok) return;
  let payload: { error?: string } = {};
  try {
    payload = await res.json();
  } catch {
    /* non-JSON */
  }
  if (res.status === 403 && payload.error === "not-enrolled") throw new Error("not-enrolled");
  throw new Error("session-exchange-failed");
}

export function LoginFormEhara() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        const idToken = await cred.user.getIdToken();
        await exchangeIdTokenForSession(idToken);
        router.replace("/portal" as Route);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if ((err as Error)?.message === "not-enrolled") {
          setError("This email isn't enrolled in Ehara Engineering. Ask your admin to invite you.");
          try {
            await firebaseSignOut(getFirebaseAuth());
          } catch {
            /* best effort */
          }
          return;
        }
        const credentialFail =
          code === "auth/wrong-password" ||
          code === "auth/invalid-credential" ||
          code === "auth/invalid-login-credentials";
        if (credentialFail && (await wasPasswordResetByAdmin(email))) {
          setError("Your password was changed by an administrator. Use the new password, or contact support.");
          return;
        }
        setError(translateFirebaseError(code));
      }
    });
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2" style={{ background: "#0b1530" }}>
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{ background: "linear-gradient(155deg,#14245c 0%,#0b1530 55%,#0a1226 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle,#e11d2f,transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle,#2b7fff,transparent 70%)" }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black shadow-lg"
            style={{ background: "linear-gradient(135deg,#1e40af,#2b7fff)" }}
          >
            E
          </div>
          <div className="text-lg font-bold tracking-tight">Ehara Engineering</div>
        </div>

        <div className="relative max-w-md">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "#f4485a" }}>
            Work &amp; Product Management
          </div>
          <h1 className="text-[2.6rem] font-black leading-[1.05] tracking-tight">
            Committed to quality.<br />On time, every part.
          </h1>
          <p className="mt-5 max-w-sm text-white/70">
            One workspace for tasks, projects, attendance, sales and new-product development —
            across the whole Ehara team.
          </p>
        </div>

        <div className="relative text-xs text-white/50">Powered by Altus Corp · © Ehara Engineering</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black text-white"
              style={{ background: "linear-gradient(135deg,#1e40af,#2b7fff)" }}
            >
              E
            </div>
            <span className="text-lg font-bold text-[#0f1b30]">Ehara Engineering</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-[#0f1b30]">Welcome back</h2>
          <p className="mt-1.5 text-sm text-[#5a6a82]">Sign in to your Ehara workspace.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#5a6a82]">
                Work email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@eharaengineering.com"
                className="w-full rounded-xl border border-[#d3dced] bg-white px-4 py-3 text-[#0f1b30] outline-none transition focus:border-[#1e40af] focus:ring-4 focus:ring-[#1e40af]/15"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wide text-[#5a6a82]">Password</label>
                <Link href={"/forgot-password" as Route} className="text-xs font-semibold text-[#1e40af] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#d3dced] bg-white px-4 py-3 pr-11 text-[#0f1b30] outline-none transition focus:border-[#1e40af] focus:ring-4 focus:ring-[#1e40af]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#5a6a82]"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-[#fdecee] px-4 py-3 text-sm font-medium text-[#c11526]">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition hover:brightness-105 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#e11d2f 0%,#b3121f 100%)", boxShadow: "0 12px 26px -10px rgba(225,29,47,.6)" }}
            >
              {isPending ? "Signing in…" : "Sign in"}
              {!isPending && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#94a3b8]">
            Private system · Members only · Access by invitation
          </p>
        </div>
      </div>
    </div>
  );
}
