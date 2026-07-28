/**
 * Transient-failure retry for the postgres-js client.
 *
 * Wraps the client so drizzle's `.unsafe(query, params)` path — both the awaited
 * form and the `.values()` form the driver uses — automatically retries a couple
 * of times when the failure is a CONNECTION-level blip: a connect timeout, a
 * dropped socket, or Supabase's pooler momentarily refusing new clients
 * (EMAXCONNSESSION). In every one of those cases the statement never actually
 * ran, so re-issuing it is safe even for writes — it can't double-apply.
 *
 * We deliberately DON'T retry real query errors (constraint violations, bad SQL,
 * permission denials): those aren't transient and the caller must see them.
 * Transactions (`.begin`) are passed straight through — retrying a partially
 * applied transaction would be unsafe.
 *
 * Net effect: a single momentary DB hiccup self-heals instead of surfacing the
 * "That didn't go through" screen. It is NOT a substitute for pointing
 * DATABASE_URL at the transaction pooler (:6543) on serverless — it's a safety
 * net on top of it.
 */

type AnyFn = (...args: unknown[]) => unknown;

const MAX_RETRIES = 2; // 3 attempts total
const BACKOFF_MS = [120, 350]; // waited before attempt 2 and 3

// postgres-js connection error codes — each means "the statement did not run".
const TRANSIENT_CODES = new Set([
  "CONNECT_TIMEOUT", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECTION_DESTROYED",
  "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "ENETUNREACH", "EHOSTUNREACH", "EAI_AGAIN",
]);
// Supabase pooler / network messages that also mean the statement never executed.
const TRANSIENT_MSG =
  /connect_timeout|connection (closed|terminated|ended|reset|refused)|max clients reached|EMAXCONNSESSION|too many connections|server closed the connection|read ECONNRESET|write EPIPE/i;

function isTransient(e: unknown, depth = 0): boolean {
  if (!e || typeof e !== "object" || depth > 4) return false;
  const err = e as { code?: string; message?: string; cause?: unknown };
  if (err.code && TRANSIENT_CODES.has(err.code)) return true;
  if (err.message && TRANSIENT_MSG.test(err.message)) return true;
  // Drizzle wraps the driver error — inspect the cause chain too.
  if (err.cause && err.cause !== e) return isTransient(err.cause, depth + 1);
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runWithRetry<T>(exec: () => PromiseLike<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await exec();
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES && isTransient(e)) {
        // eslint-disable-next-line no-console
        console.warn(`[db-retry] transient DB error — retry ${attempt + 1}/${MAX_RETRIES}`);
        await sleep(BACKOFF_MS[attempt] ?? 350);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

type ValuesQuery = PromiseLike<unknown> & { values: () => PromiseLike<unknown> };

// A thenable that defers execution to `makeQuery` and retries transient blips.
// Mirrors exactly the slice of the postgres-js Query surface drizzle touches:
// direct await (`.then`) and `.values()`. Each attempt builds a FRESH query, so
// a retry is a clean re-execution, never a re-await of the failed one.
function retryable(makeQuery: () => ValuesQuery) {
  const direct = () => runWithRetry(() => makeQuery());
  return {
    then: (onF?: ((v: unknown) => unknown) | null, onR?: ((e: unknown) => unknown) | null) => direct().then(onF, onR),
    catch: (onR?: ((e: unknown) => unknown) | null) => direct().catch(onR),
    finally: (onFin?: (() => void) | null) => direct().finally(onFin),
    values: () => {
      const runValues = () => runWithRetry(() => makeQuery().values());
      return {
        then: (onF?: ((v: unknown) => unknown) | null, onR?: ((e: unknown) => unknown) | null) => runValues().then(onF, onR),
        catch: (onR?: ((e: unknown) => unknown) | null) => runValues().catch(onR),
        finally: (onFin?: (() => void) | null) => runValues().finally(onFin),
      };
    },
  };
}

export function withDbRetry<T extends AnyFn>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "unsafe" && typeof value === "function") {
        return (...args: unknown[]) => retryable(() => Reflect.apply(value as AnyFn, target, args) as ValuesQuery);
      }
      // Everything else (template-tag calls via the callable target, `.begin`
      // transactions, internal accessors) passes through unchanged.
      if (typeof value === "function") return (value as AnyFn).bind(target);
      return value;
    },
  }) as T;
}
