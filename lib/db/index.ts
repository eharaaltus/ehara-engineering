import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/db/schema";
import { withSlowQueryLog } from "./slow-query";

// Cache the postgres client on globalThis so Next.js HMR doesn't leak
// connections on every save. In production this just runs once.
const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pg ??
  postgres(env.DATABASE_URL, {
    // Harmless on the session pooler; also keeps us safe if DATABASE_URL is ever
    // pointed at the transaction pooler (6543), where named prepared statements
    // break. Session mode would allow prepares, but we don't rely on them.
    prepare: false,
    // POOLER CHOICE — use the SESSION pooler (port 5432), not the transaction
    // pooler (6543). This app is a PERSISTENT server with its own connection
    // pool, not an ephemeral serverless client. The transaction pooler is built
    // for the latter and, from a remote persistent client, WEDGES under
    // concurrent connection bursts: verified locally that 8 parallel page
    // renders (what a browser generates via navigation + prefetch) left ~half
    // the requests hung at 60s+ on 6543, cascading to 120s — i.e. the dashboard
    // "keeps loading forever" when you click around. The exact same burst on the
    // session pooler (5432) served all 8 in 0.6–1.0s, every round. So the port
    // is the fix; keep DATABASE_URL on :5432.  (For a future serverless/Vercel
    // deploy, revisit: there 6543 with a small `max` is the right trade-off.)
    //
    // `max` is connections held to the pooler. 10 gives headroom for the
    // dashboard's ~15-query Promise.all without starving under a couple of
    // concurrent renders.
    max: 10,
    // Recycle idle sockets fast (10s): a pooled socket idle for more than a few
    // seconds can be dropped by the pooler/network while postgres-js still
    // believes it's live, and the next query on that dead socket hangs until TCP
    // keep_alive notices. Closing at 10s idle means we reconnect (~250ms) rather
    // than hang. keep_alive:20 bounds the case where a socket dies mid-query.
    // (History: briefly raising idle_timeout to 60 to "keep sockets warm"
    // reintroduced exactly that stale-socket hang — don't.)
    idle_timeout: 10,
    max_lifetime: 60 * 10,
    connect_timeout: 10,
    keep_alive: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pg = client;
}

// Phase 0.1 — opt-in slow-query logger. Enable in any environment by
// setting SLOW_QUERY_MS (e.g. "300"). Disabled by default so production
// stays quiet until we deliberately turn it on. NODE_ENV=development
// auto-enables at 300ms so local clicks immediately surface hotspots.
const slowEnvVar = process.env.SLOW_QUERY_MS;
const slowMs = slowEnvVar
  ? Number(slowEnvVar)
  : process.env.NODE_ENV === "development"
    ? 300
    : NaN;
const tracedClient = Number.isFinite(slowMs) ? withSlowQueryLog(client, slowMs) : client;

export const db = drizzle(tracedClient, { schema });
export * from "@/db/schema";
export type { Employee, NewEmployee, Task, NewTask } from "@/db/schema";
