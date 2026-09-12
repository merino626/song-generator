"use client";

import { useEffect, useState } from "react";
import { getOccasion } from "@/lib/occasions";
import { getStyle } from "@/lib/music-styles";
import { useDict } from "@/components/LocaleProvider";
import { locOccasion, locStyle, type Dict } from "@/lib/dict";
import { fmt } from "@/lib/i18n";
import { AudioPlayer } from "@/components/AudioPlayer";

type Faixa = { id: string; duracaoS?: number; url: string };
type Pedido = {
  token: string;
  estado: "rascunho" | "aguardando_pagamento" | "produzindo" | "pronta" | "reembolsado";
  titulo?: string;
  letra?: string;
  para?: string;
  de?: string;
  ocasiao?: string;
  estilo?: string;
  plano?: "standard" | "priority";
  criadoEm?: string;
  pagoEm?: string;
  faixas: Faixa[];
  capa?: string | null;
};

/** Horas do prazo garantido por plano; os rótulos vêm do dicionário. */
const SLA_HORAS: Record<string, number> = { priority: 1, standard: 6 };

/**
 * Etapas da produção, com o segundo em que cada uma termina.
 *
 * Os tempos vêm do que a geração real leva (~90–105s medidos no provider), não
 * de telemetria de sub-etapa — isso não existe. Mostrar como LISTA, com as
 * concluídas marcadas, é o que dá sensação de estar chegando perto: uma frase
 * que só troca não informa quanto já andou.
 *
 * A última não tem fim: enquanto a música não chega, ela fica girando. Nenhuma
 * etapa pode "terminar" antes do arquivo existir, senão a tela mente.
 */
const ETAPA_CORTES = [25, 55, 85, Infinity];

/** Tempo decorrido desde o pagamento, atualizado a cada segundo. */
function useElapsedSeconds(since?: string) {
  const [elapsedS, setElapsedS] = useState(0);
  useEffect(() => {
    if (!since) return;
    const inicio = new Date(since).getTime();
    const tick = () => setElapsedS(Math.max(0, (Date.now() - inicio) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  return elapsedS;
}

/**
 * Canal de suporte — conversa nos dois sentidos sem API nenhuma.
 *
 * Um link `wa.me` abre o WhatsApp do cliente já com a mensagem escrita e o
 * número do pedido dentro; a resposta sai do celular do operador, normalmente.
 * Não precisa de Cloud API, template aprovado nem serviço não-oficial — e
 * portanto não há risco de o número ser banido.
 *
 * Sem `NEXT_PUBLIC_SUPORTE_WHATSAPP` configurado, cai para e-mail; sem os
 * dois, não promete canal nenhum (melhor calar do que prometer atendimento
 * que não existe).
 */
function Suporte({ pedidoToken, d }: { pedidoToken: string; d: Dict }) {
  const zap = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP;
  const mail = process.env.NEXT_PUBLIC_SUPORTE_EMAIL;

  if (zap) {
    const texto = encodeURIComponent(fmt(d.pedido.suporteMsg, { id: pedidoToken.slice(0, 8) }));
    return (
      <a
        href={`https://wa.me/${zap.replace(/\D/g, "")}?text=${texto}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary mt-3 inline-block !px-4 !py-2 text-sm"
      >
        {d.pedido.falarWhatsApp}
      </a>
    );
  }
  if (mail) {
    return (
      <a
        href={`mailto:${mail}?subject=${encodeURIComponent(fmt(d.pedido.suporteAssunto, { id: pedidoToken.slice(0, 8) }))}`}
        className="btn-secondary mt-3 inline-block !px-4 !py-2 text-sm"
      >
        {d.pedido.falar}
      </a>
    );
  }
  return null;
}

function formatoDecorrido(d: Dict, s: number): string {
  if (s < 60) return d.pedido.haPoucosSegundos;
  const min = Math.floor(s / 60);
  if (min < 60) return fmt(d.pedido.haMin, { n: min });
  const h = Math.floor(min / 60);
  return fmt(d.pedido.haMin, { n: `${h}h${String(min % 60).padStart(2, "0")}` });
}

/**
 * Página de entrega — o momento mais importante do produto.
 *
 * Enquanto produz, faz polling: a pessoa deixa a aba aberta e a música aparece
 * sozinha, sem precisar recarregar nem esperar e-mail.
 */
export function PedidoView({ token, inicial }: { token: string; inicial: Pedido }) {
  const [pedido, setPedido] = useState<Pedido>(inicial);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (pedido.estado !== "produzindo") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/pedido/${token}`, { cache: "no-store" });
        if (r.ok) setPedido(await r.json());
      } catch {
        /* silencioso: tenta de novo no próximo ciclo */
      }
    }, 6000);
    return () => clearInterval(t);
  }, [pedido.estado, token]);

  const d = useDict();
  const occasionBase = getOccasion(pedido.ocasiao);
  const occasion = occasionBase ? locOccasion(d, occasionBase) : undefined;
  const styleBase = getStyle(pedido.estilo);
  const style = styleBase ? locStyle(d, styleBase) : undefined;
  const linkPublico = typeof window !== "undefined" ? window.location.href : "";

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* navegador pode bloquear */
    }
  }

  // ---------------------------------------------------------- produzindo
  if (pedido.estado === "produzindo") {
    return <Produzindo pedido={pedido} occasion={occasion} style={style} copiado={copiado} onCopiar={copiarLink} d={d} />;
  }

  // ------------------------------------------------ aguardando pagamento
  if (pedido.estado === "aguardando_pagamento") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-serif text-3xl text-ink">{d.pedido.faltaPouco}</h1>
        <p className="mt-3 text-ink/60">{d.pedido.aguardandoSub}</p>
        <a href="/criar/checkout" className="btn-primary mt-8">
          {d.pedido.concluirPagamento}
        </a>
      </main>
    );
  }

  if (pedido.estado === "reembolsado") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-serif text-3xl text-ink">{d.pedido.reembolsado}</h1>
        <p className="mt-3 text-ink/60">{d.pedido.reembolsadoSub}</p>
      </main>
    );
  }

  // --------------------------------------------------------------- pronta
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-wine-50 px-4 py-1.5 text-xs font-medium text-wine-700">
          {d.pedido.prontaBadge}
        </span>
        <h1 className="mt-5 font-serif text-4xl leading-tight text-ink">{pedido.titulo}</h1>
        <p className="mt-2 text-ink/60">{fmt(d.pedido.paraDe, { para: pedido.para ?? "", de: pedido.de ?? "" })}</p>
      </div>

      {pedido.capa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pedido.capa}
          alt={`Capa de ${pedido.titulo}`}
          className="mx-auto mt-8 aspect-square w-56 rounded-3xl object-cover shadow-lg"
        />
      )}

      {/* Duas versões: nosso diferencial — o cliente escolhe a que emocionou mais */}
      <section className="mt-8 space-y-3">
        {pedido.faixas.length > 1 && (
          <p className="text-center text-sm text-ink/55">{d.pedido.duasVersoes}</p>
        )}

        {pedido.faixas.map((f, i) => (
          <div key={f.id} className="card p-5">
            <div className="flex items-center justify-between gap-3">
              {/* O rótulo é montado aqui, não vindo da API: a API não sabe o
                  idioma da interface, e "Versão N"/"Version N" depende dele. */}
              <p className="font-medium text-ink">{fmt(d.pedido.versaoRotulo, { n: i + 1 })}</p>
              {f.duracaoS && (
                <span className="text-xs text-ink/45">
                  {Math.floor(f.duracaoS / 60)}:{String(Math.round(f.duracaoS % 60)).padStart(2, "0")}
                </span>
              )}
            </div>
            <AudioPlayer src={f.url} />
            <a href={f.url} download className="btn-secondary mt-3 w-full !py-2.5 text-sm">
              {d.pedido.baixar}
            </a>
          </div>
        ))}
      </section>

      {/* Compartilhar — é daqui que vem crescimento orgânico */}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(fmt(d.pedido.compartilharTexto, { link: linkPublico }))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !py-3"
        >
          {d.pedido.enviarWhatsApp}
        </a>
        <button onClick={copiarLink} className="btn-secondary !py-3">
          {copiado ? d.pedido.linkCopiado : d.pedido.copiar}
        </button>
      </div>

      {pedido.letra && (
        <details className="card mt-6 p-5">
          <summary className="cursor-pointer font-medium text-ink">{d.pedido.verLetra}</summary>
          <p className="lyrics mt-4 text-[15px] text-ink/80">{pedido.letra}</p>
        </details>
      )}

      <div className="mt-8 rounded-2xl bg-wine-50/60 p-5 text-center text-sm">
        <p className="font-medium text-ink">{d.pedido.naoFicou}</p>
        <p className="mt-1 text-ink/60">{d.pedido.refazemos}</p>
        <Suporte pedidoToken={pedido.token} d={d} />
      </div>

      <p className="mt-6 text-center text-xs text-ink/45">{d.pedido.guardeEste}</p>
    </main>
  );
}

function Produzindo({
  pedido,
  occasion,
  style,
  copiado,
  onCopiar,
  d,
}: {
  pedido: Pedido;
  occasion: ReturnType<typeof getOccasion>;
  style: ReturnType<typeof getStyle>;
  copiado: boolean;
  onCopiar: () => void;
  d: Dict;
}) {
  const elapsedS = useElapsedSeconds(pedido.pagoEm);
  const plano = pedido.plano ?? "standard";
  const sla = { label: plano === "priority" ? d.pedido.slaPrioridade : d.pedido.slaPadrao, horas: SLA_HORAS[plano] };

  // Barra assintótica: sobe rápido no começo, desacelera, e nunca chega a
  // 100% sozinha — só quando o pedido realmente virar "pronta" (a troca de
  // tela cuida disso). Janela de referência ~90s: bate com o que a produção
  // real costuma levar, bem mais curto que a garantia de 1h/6h do plano.
  const progresso = Math.min(93, Math.round(100 * (1 - Math.exp(-elapsedS / 45))));
  const etapaAtual = ETAPA_CORTES.findIndex((corte) => elapsedS < corte);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <div className="mx-auto flex h-20 w-20 items-end justify-center gap-1.5" aria-hidden>
        {[16, 30, 44, 26, 36].map((h, i) => (
          <span
            key={i}
            className="w-2 origin-bottom rounded-full bg-wine-500 animate-equalize"
            style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>

      <h1 className="mt-8 font-serif text-3xl text-ink">{d.pedido.produzindoTitulo}</h1>
      <p className="mx-auto mt-3 max-w-md text-ink/60">{fmt(d.pedido.produzindoSub, { para: pedido.para ?? "" })}</p>

      <div className="card mx-auto mt-8 max-w-md p-5 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-ink">
            {occasion?.emoji} {occasion?.label} · {style?.label}
          </p>
          {sla && (
            <span className="shrink-0 rounded-full bg-wine-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-wine-700">
              {sla.label}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-ink/55">{fmt(d.pedido.paraDe, { para: pedido.para ?? "", de: pedido.de ?? "" })}</p>

        {/* Barra de progresso — pacing visual, não telemetria real de etapa */}
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-wine-100">
            <div
              className="h-full rounded-full bg-wine-500 transition-all duration-1000 ease-out"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink/45">
            <span>{elapsedS < 110 ? d.pedido.prazoNormal : d.pedido.prazoFinal}</span>
            <span>{pedido.pagoEm ? formatoDecorrido(d, elapsedS) : null}</span>
          </div>
        </div>

        {/* Etapas: as concluídas ficam marcadas. Ver ETAPAS por que é lista. */}
        <ul className="mt-4 space-y-2 border-t border-wine-100 pt-4">
          {d.pedido.etapas.map((texto, i) => {
            const feita = i < etapaAtual;
            const agora = i === etapaAtual;
            return (
              <li
                key={texto}
                className={`flex items-center gap-2.5 text-sm ${
                  feita ? "text-ink/45" : agora ? "font-medium text-ink" : "text-ink/25"
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                  {feita ? (
                    <span className="text-wine-600">✓</span>
                  ) : agora ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-wine-200 border-t-wine-600" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
                  )}
                </span>
                {texto}
              </li>
            );
          })}
        </ul>

        {sla && (
          <p className="mt-3 border-t border-wine-100 pt-3 text-xs text-ink/50">{fmt(d.pedido.garantia, { h: sla.horas })}</p>
        )}
      </div>

      <button onClick={onCopiar} className="btn-secondary mt-6">
        {copiado ? d.pedido.linkCopiado : d.pedido.copiarLink}
      </button>
      <p className="mt-3 text-xs text-ink/45">{d.pedido.guardeLink}</p>
    </main>
  );
}
