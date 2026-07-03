// Ehara-only cleanup — drops ONLY the custom test tables/enums created earlier
// by the from-scratch app, so the real AA-Tech-WMS migrations get a clean slate.
// It does NOT touch the whole schema, auth/storage, or any other project.
// The real Ehara data lives in Google Sheets and is untouched by this.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url || !url.includes("ukopxlinlzlmhgccxmzk")) {
  console.error("Refusing to run: DATABASE_URL is not the Ehara project.");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1 });

// Only the objects the earlier custom app created (all just test data).
const tables = [
  "product_tasks", "tasks", "products", "activity_templates",
  "stages", "subjects", "customers", "employees",
  "__drizzle_migrations",
];
const enums = [
  "role", "task_status", "priority", "product_status",
  "applicability", "resolution",
];

for (const t of tables) {
  await sql.unsafe(`drop table if exists public."${t}" cascade;`);
}
for (const e of enums) {
  await sql.unsafe(`drop type if exists public."${e}" cascade;`);
}
await sql.unsafe(`drop schema if exists drizzle cascade;`); // custom app's migration tracker

const left = await sql`select tablename from pg_tables where schemaname='public'`;
console.log(`✅ Cleaned. Remaining public tables: ${left.length ? left.map((r) => r.tablename).join(", ") : "(none)"}`);
await sql.end();
process.exit(0);
