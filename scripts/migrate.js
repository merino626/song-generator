/**
 * Aplica migrations no Postgres do Supabase.
 *   node scripts/migrate.js supabase/migrations/0001_init.sql
 *
 * Tenta a conexão direta (IPv6-only) e cai para o pooler (IPv4), que é o que
 * funciona na maioria das redes e no deploy.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// lê .env.local sem depender de pacote externo
try {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const file = process.argv[2];
if (!file) {
  console.error("uso: node scripts/migrate.js <arquivo.sql>");
  process.exit(1);
}
const sql = fs.readFileSync(path.resolve(file), "utf8");

const REF = process.env.SUPABASE_PROJECT_REF || "hoydxqnjzssnhonkhjua";
const PASS = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || "hW3CVFYMt6YZ+Hi");

const candidates = [
  `postgresql://postgres:${PASS}@db.${REF}.supabase.co:5432/postgres`,
  ...["sa-east-1", "us-east-1", "us-east-2", "us-west-1"].flatMap((r) =>
    ["aws-0", "aws-1"].map((p) => `postgresql://postgres.${REF}:${PASS}@${p}-${r}.pooler.supabase.com:5432/postgres`),
  ),
];

(async () => {
  for (const cs of candidates) {
    const host = cs.split("@")[1].split(":")[0];
    const client = new Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    });
    try {
      await client.connect();
      console.log("conectado via", host);
      await client.query(sql);
      console.log("✓ migration aplicada:", path.basename(file));
      const r = await client.query(
        "select table_name from information_schema.tables where table_schema='public' order by table_name",
      );
      console.log("tabelas:", r.rows.map((x) => x.table_name).join(", "));
      await client.end();
      process.exit(0);
    } catch (e) {
      console.log(`· ${host}: ${e.message.slice(0, 100)}`);
      try {
        await client.end();
      } catch {}
    }
  }
  console.error("não foi possível conectar em nenhum host");
  process.exit(1);
})();
