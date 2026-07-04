/**
 * Hard per-query timeout — wraps a postgres-js client so any single query that
 * runs longer than `timeoutMs` is CANCELLED server-side (postgres-js `.cancel()`
 * sends a Postgres CancelRequest over a fresh socket). The awaiting caller then
 * rejects with "canceling statement due to user request" and the pooled
 * connection is returned to the pool healthy — verified: a cancelled query frees
 * the slot and the next query runs in ~9ms.
 *
 * Why this exists: Supabase's Supavisor pooler can leave a client socket OPEN
 * while its backend is gone. TCP keep-alive doesn't fire (the socket is alive at
 * the TCP layer), and the pooler swallows startup GUCs so `statement_timeout`
 * can't be pre-armed. Without this cap, one such query hangs until it's the last
 * thing standing, starves the 10-connection pool, and every page waits on it —
 * the intermittent multi-MINUTE page loads + eventual dev-server crash. Capping
 * each query converts that worst case into a fast failure that the page's
 * try/catch renders as a friendly Retry panel.
 *
 * Implemented as a Proxy mirroring `withSlowQueryLog`: we intercept the
 * template-tag call (`apply`) and the drizzle exit points on the client
 * (`unsafe` / `array` / `file` / `simple`). `begin` (explicit transactions) is
 * deliberately left untouched — cancelling a half-run transaction is a different
 * problem and drizzle's normal reads never go through it. The wrapper returns
 * the postgres-js query object UNCHANGED (so `.values()`, `.execute()`, etc.
 * still work); it only attaches a cancel timer that clears when the query
 * settles.
 */
type AnyFn = (...args: unknown[]) => unknown;

/** Default cap. Real queries here are <1s (≈800 rows); this is pure headroom. */
const DEFAULT_TIMEOUT_MS = 15_000;

function attachTimeout<T>(result: T, timeoutMs: number): T {
  const q = result as unknown as { then?: AnyFn; cancel?: () => void };
  // Only postgres-js pending queries have BOTH `.then` and `.cancel`.
  if (q && typeof q.then === "function" && typeof q.cancel === "function") {
    const timer = setTimeout(() => {
      try {
        q.cancel!();
      } catch {
        /* already settled / not cancellable — ignore */
      }
    }, timeoutMs);
    // Clear the timer when the query settles. Mirrors withSlowQueryLog: awaiting
    // the (lazy) query here just adopts its single cached result — it does not
    // run the query twice.
    Promise.resolve(result as unknown).then(
      () => clearTimeout(timer),
      () => clearTimeout(timer),
    );
  }
  return result;
}

export function withQueryTimeout<T extends AnyFn>(
  client: T,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): T {
  return new Proxy(client, {
    apply(target, thisArg, args) {
      const result = Reflect.apply(target as AnyFn, thisArg, args);
      return attachTimeout(result, timeoutMs);
    },
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      // Only the query exit points drizzle uses; everything else is bound so
      // postgres-js internals that rely on `this` keep working.
      if (prop !== "unsafe" && prop !== "array" && prop !== "file" && prop !== "simple") {
        return (value as AnyFn).bind(target);
      }
      return new Proxy(value as AnyFn, {
        apply(fn, thisArg2, args) {
          const result = Reflect.apply(fn, thisArg2 ?? target, args);
          return attachTimeout(result, timeoutMs);
        },
      });
    },
  }) as T;
}
