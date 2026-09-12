// Verifica se o filtro de janela do painel de abuso realmente corta por data.
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const hAtras = (h) => new Date(Date.now() - h * 3600_000).toISOString();

(async () => {
  // 3 identidades plantadas em idades diferentes (2 eventos cada, o mínimo do relatório)
  const casos = [
    ["fp-agora", 1],
    ["fp-12h", 12],
    ["fp-100h", 100],
  ];
  await db.from("generation_events").delete().in("fingerprint", casos.map(([f]) => f));

  for (const [fp, idade] of casos) {
    await db.from("generation_events").insert(
      [0, 1].map(() => ({
        fingerprint: fp,
        ip: "192.0.2.1",
        story_hash: "hash-fixo",
        created_at: hAtras(idade),
      })),
    );
  }

  for (const janela of [6, 24, 72, 168]) {
    const { data, error } = await db.rpc("abuse_report", { p_hours: janela });
    if (error) throw new Error(error.message);
    const vistos = casos.map(([fp]) => fp).filter((fp) => (data ?? []).some((r) => r.value === fp));
    const esperado = casos.filter(([, idade]) => idade < janela).map(([fp]) => fp);
    const ok = JSON.stringify(vistos.sort()) === JSON.stringify(esperado.sort());
    console.log(
      `janela ${String(janela).padStart(3)}h -> encontrou [${vistos.join(", ")}] | esperado [${esperado.join(", ")}] ${ok ? "✓" : "✗ ERRO"}`,
    );
  }

  await db.from("generation_events").delete().in("fingerprint", casos.map(([f]) => f));
  process.exit(0);
})();
