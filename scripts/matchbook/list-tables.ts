import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL as string);
  const rows = await sql`
    select tablename from pg_tables where schemaname = 'public' order by tablename
  `;
  console.log("TABLES: " + rows.map((r) => r.tablename).join(", "));
  await sql.end();
}

main();
