import { redirect } from "next/navigation";
import type { Route } from "next";
import { LoginFormEhara } from "@/components/auth/login-form-ehara";
import { getCurrentEmployee } from "@/lib/auth/current";

/**
 * /login — clean Ehara Engineering split-screen sign-in.
 * Same Firebase email/password + session-exchange auth as before; only the
 * chrome is Ehara-branded (navy brand panel + white form card, red CTA).
 * Signed-in employees are redirected to the portal launcher.
 */
export default async function LoginPage() {
  const me = await getCurrentEmployee();
  if (me && me.isActive) {
    redirect("/portal" as Route);
  }
  return <LoginFormEhara />;
}
