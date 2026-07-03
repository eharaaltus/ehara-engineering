import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url || !url.includes("ukopxlinlzlmhgccxmzk")) { console.error("Not Ehara DB"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });
await sql`update org_settings set company_name='Ehara Engineering' where id=1`;
const r = await sql`select company_name from org_settings where id=1`;
console.log("company_name =", r[0]?.company_name);
await sql.end(); process.exit(0);
