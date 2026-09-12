"use client";

import { useEffect, useState } from "react";
import { useDict } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n";

/**
 * Tela de espera da letra (~6s até a primeira versão aparecer).
 *
 * Três coisas que a fazem parecer curta:
 *  1. ESQUELETO da própria letra — a pessoa já vê o formato do que vem aí, em
 *     vez de um vazio. É o mesmo truque de quem carrega feed: mostrar a forma
 *     antes do conteúdo faz a espera parecer menor do que é.
 *  2. BARRA que avança sempre, nunca completa — some só quando o conteúdo
 *     chega de verdade. Barra que trava em 100% e continua esperando destrói a
 *     confiança em todo o resto da tela.
 *  3. ETAPAS que mudam, mostrando o que está sendo feito naquele instante.
 */

/** Momentos de corte das etapas; os textos vêm do dicionário (mesma ordem). */
const ETAPA_CORTES = [2, 5, 9, 14, 999];

function useSegundos(ativo: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setS((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [ativo]);
  return s;
}

export function EscrevendoLetra({ erro, onTentarDeNovo }: { erro: string | null; onTentarDeNovo: () => void }) {
  const s = useSegundos(!erro);
  const d = useDict();

  // Curva que desacelera: sobe rápido no começo e vai chegando perto de 95%
  // sem nunca bater — assim nunca "termina" antes da letra existir.
  const progresso = Math.min(95, Math.round(100 * (1 - Math.exp(-s / 6))));
  const etapa = d.escrevendo.etapas[ETAPA_CORTES.findIndex((corte) => s < corte)] ?? d.escrevendo.etapas.at(-1)!;

  if (erro) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <p className="text-3xl">😕</p>
        <h1 className="mt-4 font-serif text-2xl text-ink">{d.escrevendo.erroTitulo}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">{erro}</p>
        <button onClick={onTentarDeNovo} className="btn-primary mt-6">
          {d.escrevendo.tentarDeNovo}
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-wine-50 px-4 py-1.5 text-xs font-medium text-wine-700">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-wine-300 border-t-wine-600" />
          {etapa}
        </span>
        <h1 className="mt-5 font-serif text-3xl text-ink sm:text-4xl">{d.escrevendo.titulo}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/60">{d.escrevendo.sub}</p>

        <div className="mx-auto mt-6 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-wine-600 transition-[width] duration-700 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Esqueleto: o formato do que está por vir */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="selectable opacity-70">
            <p className="text-[11px] uppercase tracking-wider text-ink/40">{fmt(d.letra.versao, { n: i + 1 })}</p>
            <div className="mt-2 h-5 w-2/3 animate-pulse rounded bg-ink/10" />
          </div>
        ))}
      </div>

      <div className="card mt-5 overflow-hidden" aria-hidden>
        <div className="border-b border-wine-100 bg-wine-50/40 px-5 py-3.5">
          <div className="h-4 w-48 animate-pulse rounded bg-ink/10" />
        </div>
        <div className="space-y-6 p-6 sm:p-8">
          {[4, 3, 4].map((linhas, bloco) => (
            <div key={bloco} className="space-y-2.5">
              <div className="h-3 w-20 animate-pulse rounded bg-wine-200/60" />
              {Array.from({ length: linhas }, (_, l) => (
                <div
                  key={l}
                  className="h-3.5 animate-pulse rounded bg-ink/10"
                  // Larguras irregulares imitam versos de verdade; blocos
                  // perfeitamente iguais parecem tabela, não letra de música.
                  style={{ width: `${[92, 78, 85, 68][l % 4]}%`, animationDelay: `${(bloco * 4 + l) * 90}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink/40">{d.escrevendo.naoPagou}</p>
    </main>
  );
}
