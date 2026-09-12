"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraft, type Draft } from "@/lib/draft";
import { getOccasion } from "@/lib/occasions";
import { getStyle, VOCALS } from "@/lib/music-styles";
import { EscrevendoLetra } from "./EscrevendoLetra";
import { useDict } from "@/components/LocaleProvider";
import { locOccasion, locStyle, locVocal } from "@/lib/dict";
import { fmt } from "@/lib/i18n";

const TOTAL_VERSOES = 2;

export function LetraView() {
  const router = useRouter();
  const { draft, update, ready } = useDraft();
  const d = useDict();
  const [editing, setEditing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const iniciado = useRef(false);

  const variants = draft.lyricsVariants || [];
  const chosen = draft.chosenVariant ?? 0;
  const temAlguma = variants.some(Boolean);

  /**
   * Consome o stream do servidor: cada versão que fica pronta já entra na tela,
   * em vez de esperar as duas. `iniciado` impede que o StrictMode do React (que
   * monta o componente duas vezes em dev) dispare duas gerações — o que
   * gastaria crédito à toa e queimaria o token de uso único.
   */
  useEffect(() => {
    if (!ready || iniciado.current) return;

    // Já tem letra (voltou de outra tela)? Não gera de novo.
    if (temAlguma) return;

    // Chegou aqui sem passar pelo wizard: não há o que gerar.
    if (!draft.captchaToken && !draft.story) {
      router.replace("/criar");
      return;
    }

    iniciado.current = true;
    setGerando(true);

    const token = draft.captchaToken;
    // Consome o token: é de uso único, e deixá-lo no rascunho faria uma
    // recarga da página tentar reusá-lo e falhar com erro confuso.
    update({ captchaToken: undefined });

    (async () => {
      try {
        const res = await fetch("/api/generate-lyrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turnstileToken: token,
            fingerprint: draft.fingerprint,
            email: draft.email,
            occasion: draft.occasion,
            recipientName: draft.recipientName,
            recipientGender: draft.recipientGender,
            relationship: draft.relationship,
            senderName: draft.senderName,
            story: draft.story,
            styleId: draft.styleId,
            vocal: draft.vocal,
          }),
        });

        if (!res.ok || !res.body) {
          const corpo = await res.json().catch(() => ({}));
          throw new Error(corpo.error || "Não conseguimos escrever a letra agora.");
        }

        // NDJSON: uma linha por evento. O buffer existe porque um chunk da rede
        // pode cortar uma linha no meio.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const recebidas: Draft["lyricsVariants"] = [];

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const linhas = buffer.split("\n");
          buffer = linhas.pop() ?? "";

          for (const linha of linhas) {
            if (!linha.trim()) continue;
            const evt = JSON.parse(linha);
            if (evt.tipo === "variante") {
              recebidas[evt.indice] = evt.variante;
              // Grava a cada chegada: a tela mostra a 1ª enquanto a 2ª vem.
              update({ lyricsVariants: [...recebidas] });
            } else if (evt.tipo === "erro") {
              throw new Error(evt.mensagem);
            }
          }
        }
      } catch (e) {
        setErro((e as Error).message);
      } finally {
        setGerando(false);
      }
    })();
    // Roda uma vez só, quando o rascunho termina de carregar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return <div className="py-24 text-center text-ink/40">{d.wizard.carregando}</div>;

  // Nada ainda: tela de escrita, com progresso.
  if (!temAlguma) {
    return <EscrevendoLetra erro={erro} onTentarDeNovo={() => router.replace("/criar")} />;
  }

  const occasionBase = getOccasion(draft.occasion);
  const occasion = occasionBase ? locOccasion(d, occasionBase) : undefined;
  const styleBase = getStyle(draft.styleId);
  const style = styleBase ? locStyle(d, styleBase) : undefined;
  // A versão escolhida pode ainda não ter chegado (chegam fora de ordem):
  // cai na primeira que existir para a tela nunca ficar vazia.
  const current = variants[chosen] ?? variants.find(Boolean)!;
  const text = draft.editedLyrics ?? current.lyrics;

  function choose(i: number) {
    // Trocar de versão descarta a edição da anterior (evita misturar textos).
    update({ chosenVariant: i, editedLyrics: undefined });
    setEditing(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-wine-50 px-4 py-1.5 text-xs font-medium text-wine-700">
          {d.letra.badge}
        </span>
        <h1 className="mt-5 font-serif text-3xl text-ink sm:text-4xl">{d.letra.titulo}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
          {gerando ? d.letra.subGerando : d.letra.sub}
        </p>
        {erro && variants.filter(Boolean).length < TOTAL_VERSOES && (
          <p className="mx-auto mt-3 max-w-xl text-xs text-wine-600">{fmt(d.letra.erroSegunda, { erro })}</p>
        )}
      </div>

      {/* Seletor de versão. Percorre os SLOTS (não o array recebido) para a
          versão que ainda está sendo escrita aparecer como esqueleto, em vez
          de a segunda opção surgir do nada e empurrar o layout. */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: TOTAL_VERSOES }, (_, i) => {
          const v = variants[i];
          if (!v) {
            return (
              <div key={i} className="selectable cursor-wait opacity-70" aria-busy>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-full">
                    <p className="text-[11px] uppercase tracking-wider text-ink/40">{fmt(d.letra.versao, { n: i + 1 })}</p>
                    <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-ink/10" />
                  </div>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-ink/35">
                    {d.letra.escrevendo}
                  </span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={chosen === i}
              className={`selectable ${chosen === i ? "selectable-active" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-ink/40">{fmt(d.letra.versao, { n: i + 1 })}</p>
                  <p className="mt-0.5 font-serif text-lg leading-tight text-ink">{v.title}</p>
                </div>
                {chosen === i && (
                  <span className="shrink-0 rounded-full bg-wine-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {d.letra.escolhida}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Letra */}
      <div className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-wine-100 bg-wine-50/40 px-5 py-3.5">
          <div className="min-w-0 text-sm text-ink/60">
            {occasion?.emoji} {occasion?.label}
            {style ? ` · ${style.label}` : ""}
            {draft.vocal ? ` · ${locVocal(d, VOCALS.find((v) => v.id === draft.vocal)!).label}` : ""}
          </div>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="text-sm font-medium text-wine-600 transition hover:text-wine-700"
          >
            {editing ? d.letra.concluirEdicao : d.letra.editar}
          </button>
        </div>

        {editing ? (
          <div className="p-5">
            <textarea
              className="field min-h-[420px] resize-y font-mono text-sm leading-relaxed"
              value={text}
              onChange={(e) => update({ editedLyrics: e.target.value })}
              autoFocus
            />
            <div className="mt-3 flex items-center justify-between text-xs">
              <p className="text-ink/45">{d.letra.editarDica}</p>
              {draft.editedLyrics !== undefined && (
                <button
                  type="button"
                  onClick={() => update({ editedLyrics: undefined })}
                  className="text-ink/50 underline hover:text-ink"
                >
                  {d.letra.restaurar}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-ink">{current.title}</h2>
            <p className="lyrics mt-4 text-[15px] text-ink/80">{text}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 space-y-3">
        <button className="btn-primary w-full !py-4 text-base" onClick={() => router.push("/criar/checkout")}>
          {d.letra.cta}
        </button>
        <div className="flex items-center justify-center gap-5 text-xs text-ink/45">
          <button onClick={() => router.push("/criar")} className="hover:text-ink">
            {d.letra.ajustar}
          </button>
          <span>·</span>
          <span>{d.letra.naoPagou}</span>
        </div>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {d.letra.cards.map((c, i) => (
          <div key={c.t} className="card flex items-start gap-3 p-4">
            <span aria-hidden>{["🎼", "⚡", "🛡️"][i]}</span>
            <div>
              <p className="text-sm font-semibold text-ink">{c.t}</p>
              <p className="text-xs leading-snug text-ink/55">{c.x}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
