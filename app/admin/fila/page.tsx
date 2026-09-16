import { supabaseAdmin } from "@/lib/supabase";
import { getStyle } from "@/lib/music-styles";
import { getOccasion } from "@/lib/occasions";
import { assumirPedido, reenviarParaRobo } from "./actions";
import { ManualDeliveryForm } from "@/components/admin/ManualDeliveryForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fila de produção — Vira Canção" };

/**
 * Painel do operador (modo híbrido).
 *
 * Mostra o que o robô não deu conta, com tudo que o operador precisa para
 * gerar na conta Suno: letra pronta para copiar, tags de estilo e o motivo
 * da falha. É a tela que garante que nenhum pedido pago fique parado.
 *
 * TODO: proteger com Supabase Auth antes de ir ao ar.
 */
/**
 * Abas da fila.
 * "Pendentes" é o padrão porque é o que exige ação sua; as outras existem
 * para você conferir que o robô está entregando (e não só sumindo da tela).
 */
const ABAS = {
  pendentes: { label: "Pendentes", status: ["manual_review", "producing_manual", "producing_robot"] },
  manual: { label: "Só manual", status: ["manual_review", "producing_manual"] },
  prontos: { label: "Prontos", status: ["ready", "delivered"] },
  todos: { label: "Todos", status: [] as string[] },
} as const;

type AbaId = keyof typeof ABAS;

/** Horas prometidas ao cliente por plano — a régua do que está atrasado. */
const SLA_HORAS: Record<string, number> = { priority: 1, standard: 6 };

function dataHora(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duracao(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h${String(min % 60).padStart(2, "0")}` : `${Math.floor(h / 24)}d${h % 24}h`;
}

/**
 * Há quanto tempo o cliente espera — e se já passou do prazo prometido.
 * Sem isto a fila é só uma lista; com isto ela diz o que fazer primeiro.
 */
function Espera({ desde, ate, plano }: { desde: string; ate?: string | null; plano?: string }) {
  const inicio = new Date(desde).getTime();
  const fim = ate ? new Date(ate).getTime() : Date.now();
  const decorrido = fim - inicio;
  const limite = (SLA_HORAS[plano ?? "standard"] ?? 6) * 3_600_000;
  const estourou = decorrido > limite;

  return (
    <span className={estourou && !ate ? "font-semibold text-wine-700" : ""}>
      {ate ? "levou" : "esperando há"} {duracao(decorrido)}
      {estourou && !ate ? " · atrasado" : ""}
    </span>
  );
}

export default async function FilaPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba: abaParam } = await searchParams;
  const aba: AbaId = (abaParam && abaParam in ABAS ? abaParam : "pendentes") as AbaId;

  let orders: any[] = [];
  let contagens: Record<string, number> = {};
  let configError: string | null = null;

  try {
    const db = supabaseAdmin();

    // "Na frente da fila" é uma promessa vendida no plano prioritário — então
    // a fila ordena por plano ANTES de ordenar por antiguidade. Sem isto a
    // frase de `lib/pricing.ts` seria só marketing: o operador veria os
    // pedidos na mesma ordem para todo mundo.
    // ("priority" < "standard" em ordem alfabética, então ascending resolve.)
    let query = db
      .from("orders")
      .select("*")
      .order("plan", { ascending: true })
      .order("paid_at", { ascending: true, nullsFirst: false })
      .limit(100);
    const filtro = ABAS[aba].status;
    if (filtro.length) query = query.in("status", filtro);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    orders = data ?? [];

    // Contagem por status, para as abas mostrarem volume sem abrir cada uma.
    const { data: todos } = await db.from("orders").select("status");
    for (const o of todos ?? []) contagens[o.status] = (contagens[o.status] ?? 0) + 1;
  } catch (e) {
    configError = (e as Error).message;
  }

  const totalDaAba = (id: AbaId) =>
    ABAS[id].status.length
      ? ABAS[id].status.reduce((s, st) => s + (contagens[st] ?? 0), 0)
      : Object.values(contagens).reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl text-ink">Fila de produção</h1>
        <span className="text-sm text-ink/50">{orders.length} exibido(s)</span>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        O robô tenta primeiro. O que ele não conclui aparece em <strong>Pendentes</strong> para você gerar na conta
        Suno e enviar o áudio.
      </p>

      <nav className="mt-4 flex flex-wrap gap-1.5 text-sm">
        {(Object.keys(ABAS) as AbaId[]).map((id) => (
          <a
            key={id}
            href={`/admin/fila?aba=${id}`}
            className={`rounded-full px-3.5 py-1.5 ${
              aba === id ? "bg-wine-600 text-white" : "text-ink/60 hover:bg-wine-50"
            }`}
          >
            {ABAS[id].label}
            <span className={`ml-1.5 text-xs ${aba === id ? "text-white/70" : "text-ink/40"}`}>{totalDaAba(id)}</span>
          </a>
        ))}
      </nav>

      {configError && (
        <div className="card mt-6 border-wine-300 bg-wine-50 p-5 text-sm text-wine-800">
          <strong>Banco não configurado:</strong> {configError}
          <p className="mt-1 text-wine-700/80">
            Rode a migration <code>supabase/migrations/0001_init.sql</code> e preencha o <code>.env.local</code>.
          </p>
        </div>
      )}

      {!configError && orders.length === 0 && (
        <div className="card mt-6 p-8 text-center text-ink/50">
          {aba === "pendentes" ? "Nada pendente — o robô está dando conta de tudo." : "Nenhum pedido nesta aba."}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {orders.map((o) => {
          const occasion = getOccasion(o.occasion);
          const style = getStyle(o.style_id);
          const manual = o.status === "manual_review";
          return (
            <article key={o.id} className={`card p-5 ${manual ? "border-wine-400" : ""}`}>
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-ink">
                    {occasion && <occasion.icon className="h-4 w-4 shrink-0 text-wine-600" aria-hidden />}
                    {o.title || `Música para ${o.recipient_name}`}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {occasion?.label} · {style?.label} · {o.vocal} · {o.plan === "priority" ? "prioritário" : "padrão"}
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    {o.customer_email} {o.customer_phone ? `· ${o.customer_phone}` : ""}
                  </p>
                  {/* Datas: sem elas não dá para saber o que está atrasado — e o
                      SLA prometido (1h no prioritário, 6h no padrão) conta a
                      partir do pagamento, não da criação. */}
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink/40">
                    <span title={o.created_at}>criado {dataHora(o.created_at)}</span>
                    {o.paid_at && (
                      <span title={o.paid_at} className="text-ink/55">
                        pago {dataHora(o.paid_at)} · <Espera desde={o.paid_at} ate={o.ready_at} plano={o.plan} />
                      </span>
                    )}
                    {o.ready_at && <span title={o.ready_at}>pronto {dataHora(o.ready_at)}</span>}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    manual
                      ? "bg-wine-600 text-white"
                      : ["ready", "delivered"].includes(o.status)
                        ? "bg-emerald-600 text-white"
                        : "bg-wine-50 text-wine-700"
                  }`}
                >
                  {
                    {
                      manual_review: "tratativa manual",
                      producing_manual: "operador assumiu",
                      producing_robot: "robô rodando",
                      ready: "pronta",
                      delivered: "entregue",
                      paid: "pago",
                      awaiting_payment: "aguardando pagamento",
                      lyrics_ready: "letra pronta",
                      draft: "rascunho",
                      error: "erro",
                      refunded: "reembolsado",
                    }[o.status as string] ?? o.status
                  }
                </span>
              </header>

              {o.manual_reason && (
                <p className="mt-3 rounded-xl bg-wine-50/70 px-3 py-2 text-xs text-wine-800">
                  Motivo: {o.manual_reason} {o.attempts ? `· ${o.attempts} tentativa(s)` : ""}
                </p>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-wine-600">
                  Ver letra e estilo para copiar
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Style / tags</p>
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-ink/5 p-3 text-xs">
                      {[style?.prompt, o.vocal === "feminino" ? "voz feminina" : o.vocal === "masculino" ? "voz masculina" : "dueto", "português do Brasil"]
                        .filter(Boolean)
                        .join(", ")}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Letra</p>
                    <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-ink/5 p-3 text-xs leading-relaxed">
                      {o.lyrics || "(sem letra)"}
                    </pre>
                  </div>
                </div>
              </details>

              {/* Conclusão manual: você gera no Suno e cola os links aqui. */}
              {["manual_review", "producing_manual", "producing_robot"].includes(o.status) && (
                <div className="mt-4 rounded-2xl border border-wine-200 bg-wine-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">Entregar manualmente</p>
                    <div className="flex gap-2">
                      {o.status === "manual_review" && (
                        <form action={assumirPedido}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <button className="btn-secondary !px-3 !py-1.5 !text-xs">Assumir</button>
                        </form>
                      )}
                      <form action={reenviarParaRobo}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <button className="btn-ghost !px-3 !py-1.5 !text-xs">↻ Tentar robô de novo</button>
                      </form>
                    </div>
                  </div>

                  <ManualDeliveryForm orderId={o.id} />

                  <p className="mt-2 text-[11px] leading-snug text-ink/45">
                    Os arquivos são copiados para o nosso R2, então o link do Suno pode expirar sem afetar o cliente.
                  </p>
                </div>
              )}

              <p className="mt-3 text-[11px] text-ink/40">
                Link do cliente:{" "}
                <a href={`/pedido/${o.public_token}`} target="_blank" className="underline hover:text-ink">
                  /pedido/{String(o.public_token).slice(0, 8)}…
                </a>
              </p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
