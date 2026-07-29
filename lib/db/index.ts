import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/db/schema";
import { withSlowQueryLog } from "./slow-query";
import { withDbRetry } from "./retry";

// Cache the postgres client on globalThis so Next.js HMR doesn't leak
// connections on every save.
const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>;
};

// REGION — Vercel functions run in Mumbai (bom1), colocated with the Supabase
// ap-south-1 project (pinned via `"regions": ["bom1"]` in vercel.json). Verify:
//   curl -I <site>/api/health | grep -i x-vercel-id  →  bom1::bom1::… (correct)

// Force the Supabase TRANSACTION pooler (:6543) regardless of which port the
// DATABASE_URL env var carries — so a wrong port can't break a deploy. The
// transaction pooler multiplexes many clients over few backends, so it never
// exhausts under serverless load (the old "database being slow / didn't go
// through"), and — with `max` set ABOVE the dashboard's parallel-query count
// (below) — it never wedges either. This mirrors the sibling JMT WMS deployment,
// which runs this exact config and loads reliably every time.
function resolvePoolerUrl(url: string): string {
  if (!url.includes("pooler.supabase.com")) return url; // non-pooler / direct — leave untouched
  return url.replace(/(pooler\.supabase\.com):5432\//, "$1:6543/");
}
const connectionString = resolvePoolerUrl(env.DATABASE_URL);

const client =
  globalForDb.__pg ??
  postgres(connectionString, {
    // Required for the transaction-mode pooler (:6543): named prepared
    // statements are per-session and break under transaction pooling.
    prepare: false,
    // Ceiling ABOVE the dashboard's parallel-read burst (header counts +
    // loadDashboardData's ~5 selects + My Day + status map ≈ 15-20 concurrent
    // reads) so they all run at once instead of queuing 5-at-a-time and piling
    // up to 25s+ ("loading forever") on a cold DB. The transaction pooler
    // allows ~200 clients, so 18 is safe headroom and cannot exhaust the pool.
    max: 18,
    // Keep sockets warm a minute so back-to-back navigations reuse the TLS
    // handshake instead of paying ~50-150ms on the next click.
    idle_timeout: 60,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });

// Cache on globalThis only OUTSIDE production — it exists to stop dev/HMR from
// leaking a new pool on every file save. In production the module-level `client`
// is already reused for the warm instance's lifetime, so it isn't needed
// (mirrors JMT's proven setup).
if (process.env.NODE_ENV !== "production") {
  globalForDb.__pg = client;
}

// Phase 0.1 — opt-in slow-query logger. Enable in any environment by setting
// SLOW_QUERY_MS (e.g. "300"). NODE_ENV=development auto-enables at 300ms.
const slowEnvVar = process.env.SLOW_QUERY_MS;
const slowMs = slowEnvVar
  ? Number(slowEnvVar)
  : process.env.NODE_ENV === "development"
    ? 300
    : NaN;
const tracedClient = Number.isFinite(slowMs) ? withSlowQueryLog(client, slowMs) : client;

// Auto-retry transient connection blips (see ./retry) so a momentary hiccup
// self-heals instead of surfacing the error screen. Retries only connection-
// level failures where the statement never ran; real query errors and
// transactions are untouched.
const resilientClient = withDbRetry(tracedClient);

export const db = drizzle(resilientClient, { schema });
export * from "@/db/schema";
export type { Employee, NewEmployee, Task, NewTask } from "@/db/schema";
