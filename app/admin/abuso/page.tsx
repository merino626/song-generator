import { supabaseAdmin } from "@/lib/supabase";
import { getSuspects, riskLabel, type Suspect } from "@/lib/abuse";
import { blockIdentity, unblockIdentity } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Abuso — Vira Canção" };

const TONS = {
  alto: "bg-wine-600 text-white",
  medio: "bg-gold-500 text-white",
  baixo: "bg-wine-50 text-wine-700",
} as const;

const ROTULO_TIPO: Record<string, string> = {
  device: "Aparelho",
  fingerprint: "Impressão digital",
  ip: "IP",
  email: "E-mail",
};

function quando(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} d`;
}

/** Janelas permitidas. Fixas de propósito: `?h=abc` viraria NaN e quebraria a consulta. */
const JANELAS = [6, 24, 72, 168] as const;

export default async function AbusoPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const { h } = await searchParams;
  const pedido = Number(h);
  const horas = JANELAS.includes(pedido as any) ? pedido : 24;

  let suspects: Suspect[] = [];
  let blocks: any[] = [];
  let stats = { total: 0, blocked: 0, converted: 0 };
  let erro: string | null = null;

  try {
    const db = supabaseAdmin();
    suspects = await getSuspects(horas);

    const { data: b } = await db
      .from("blocks")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    blocks = b ?? [];

    const desde = new Date(Date.now() - horas * 3600_000).toISOString();
    const { data: ev } = await db.from("generation_events").select("blocked,converted").gte("created_at", desde);
    stats = {
      total: ev?.length ?? 0,
      blocked: ev?.filter((e: any) => e.blocked).length ?? 0,
      converted: ev?.filter((e: any) => e.converted).length ?? 0,
    };
  } catch (e) {
    erro = (e as Error).message;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl text-ink">Detecção de abuso</h1>
        <nav className="flex gap-1 text-sm">
          {JANELAS.map((n) => (
            <a
              key={n}
              href={`/admin/abuso?h=${n}`}
              className={`rounded-full px-3 py-1 ${horas === n ? "bg-wine-600 text-white" : "text-ink/55 hover:bg-wine-50"}`}
            >
              {n < 24 ? `${n}h` : `${n / 24}d`}
            </a>
          ))}
        </nav>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        O score ordena a suspeita para você revisar — ele não condena sozinho. Confira os sinais antes de bloquear.
      </p>

      {erro && (
        <div className="card mt-6 border-wine-300 bg-wine-50 p-5 text-sm text-wine-800">
          <strong>Erro:</strong> {erro}
          <p className="mt-1">Rode a migration <code>0003_abuso.sql</code>.</p>
        </div>
      )}

      {/* Resumo */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Gerações", stats.total, "no período"],
          ["Barradas", stats.blocked, "pelo limite ou bloqueio"],
          ["Viraram compra", stats.converted, "conversão"],
        ].map(([t, v, sub]) => (
          <div key={String(t)} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-ink/45">{t}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{String(v)}</p>
            <p className="text-xs text-ink/45">{sub}</p>
          </div>
        ))}
      </div>

      {/* Suspeitos */}
      <h2 className="mt-10 font-serif text-xl text-ink">Suspeitos</h2>
      {suspects.length === 0 && !erro && (
        <div className="card mt-3 p-8 text-center text-ink/50">Nada suspeito no período.</div>
      )}

      <div className="mt-3 space-y-3">
        {suspects.map((s) => {
          const risco = riskLabel(s.score);
          const jaBloqueado = blocks.some((b) => b.kind === s.kind && b.value === s.value);
          return (
            <article key={`${s.kind}:${s.value}`} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${TONS[risco.tone]}`}>
                      {risco.label} · {s.score}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-ink/45">{ROTULO_TIPO[s.kind] ?? s.kind}</span>
                    {jaBloqueado && (
                      <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        bloqueado
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 break-all font-mono text-sm text-ink">{s.value}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.flags.map((f) => (
                      <span key={f} className="rounded-full bg-wine-50 px-2 py-0.5 text-[11px] text-wine-700">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink/45">
                    {s.events} gerações · {s.distinctStories} histórias distintas · {s.distinctIps} IPs ·{" "}
                    {s.distinctEmails} e-mails · visto {quando(s.lastSeen)}
                  </p>
                </div>

                {!jaBloqueado && (
                  <form action={blockIdentity} className="flex shrink-0 items-center gap-2">
                    <input type="hidden" name="kind" value={s.kind} />
                    <input type="hidden" name="value" value={s.value} />
                    <input type="hidden" name="reason" value={`score ${s.score}: ${s.flags.join("; ")}`} />
                    <select name="hours" className="rounded-xl border border-wine-200 px-2 py-1.5 text-xs" defaultValue="24">
                      <option value="24">24h</option>
                      <option value="168">7 dias</option>
                      <option value="0">Permanente</option>
                    </select>
                    <button className="btn-primary !px-4 !py-2 !text-xs">Bloquear</button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Bloqueios ativos */}
      <h2 className="mt-10 font-serif text-xl text-ink">Bloqueios ativos ({blocks.length})</h2>
      {blocks.length === 0 && <p className="mt-3 text-sm text-ink/50">Nenhum bloqueio ativo.</p>}

      <div className="mt-3 space-y-2">
        {blocks.map((b) => (
          <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="break-all font-mono text-sm text-ink">
                <span className="mr-2 rounded bg-ink/5 px-1.5 py-0.5 text-[11px] uppercase not-italic text-ink/55">
                  {ROTULO_TIPO[b.kind] ?? b.kind}
                </span>
                {b.value}
              </p>
              <p className="mt-0.5 text-xs text-ink/45">
                {b.reason} · por {b.created_by} ·{" "}
                {b.expires_at ? `expira ${new Date(b.expires_at).toLocaleString("pt-BR")}` : "permanente"}
              </p>
            </div>
            <form action={unblockIdentity}>
              <input type="hidden" name="id" value={b.id} />
              <button className="btn-secondary !px-4 !py-2 !text-xs">Desbloquear</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
