import { redirect } from "next/navigation";
import type { Route } from "next";

export const dynamic = "force-dynamic";

// The NPD dashboard is now an in-page view toggle on /npd (no separate page —
// faster, no back-and-forth). Keep this route as a redirect for old links.
export default function NpdDashboardRedirect() {
  redirect("/npd" as Route);
}
