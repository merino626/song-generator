"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/lib/draft";
import { PLANS, formatBRL, totalCents, type PlanId, type UpsellId } from "@/lib/pricing";
import { getOccasion } from "@/lib/occasions";
import { useDict } from "@/components/LocaleProvider";
import { locPlan } from "@/lib/dict";
import { fmt } from "@/lib/i18n";

export function CheckoutView() {
  const router = useRouter();
  const { draft, update, ready } = useDraft();
  const d = useDict();
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const plan: PlanId = draft.plan ?? "priority";
  // Enquanto os upsells não existirem como produto, ninguém é cobrado por
  // eles — nem quem ficou com a seleção antiga salva no localStorage.
  const upsells: UpsellId[] = [];

  useEffect(() => {
    if (ready && !draft.lyricsVariants?.length) router.replace("/criar");
  }, [ready, draft.lyricsVariants, router]);

  // Limpa seleção de upsell que tenha sobrado de uma visita anterior: sem
  // isto o rascunho continuaria mandando `upsells` para /api/checkout/order,
  // que somaria o valor e cobraria por algo que não entregamos.
  useEffect(() => {
    if (ready && draft.upsells?.length) update({ upsells: [] });
  }, [ready, draft.upsells, update]);

  if (!ready) return <div className="py-24 text-center text-ink/40">{d.wizard.carregando}</div>;

  const occasion = getOccasion(draft.occasion);
  const total = totalCents(plan, upsells);

  /**
   * Persiste o pedido no banco AGORA — é o "commit point" do funil. Antes
   * disso tudo vivia só no localStorage. É aqui que a letra escolhida vira
   * o texto final gravado (o cliente já não edita depois desse ponto).
   */
  async function irParaPagamento() {
    setIndo(true);
    setErro(null);
    try {
      const variante = draft.lyricsVariants?.[draft.chosenVariant ?? 0];
      const lyrics = draft.editedLyrics ?? variante?.lyrics ?? "";
      const title = variante?.title || `Música para ${draft.recipientName}`;

      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: draft.orderId,
          occasion: draft.occasion,
          recipientName: draft.recipientName,
          recipientGender: draft.recipientGender,
          relationship: draft.relationship,
          senderName: draft.senderName,
          story: draft.story,
          styleId: draft.styleId,
          vocal: draft.vocal,
          email: draft.email,
          phone: draft.phone,
          title,
          lyrics,
          plan,
          upsells,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível continuar");

      update({ orderId: data.orderId, publicToken: data.publicToken });
      router.push("/criar/pagamento");
    } catch (e) {
      setErro((e as Error).message);
      setIndo(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-ink/45">{d.checkout.ultimoPasso}</p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-wine-100">
          <div className="h-full w-full rounded-full bg-wine-600" />
        </div>
      </div>

      <div className="text-center">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">{d.checkout.titulo}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink/60">{d.checkout.sub}</p>
      </div>

      {/* Planos */}
      <div className="mt-8 space-y-4">
        {PLANS.map((base) => {
          const p = locPlan(d, base);
          const active = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ plan: p.id })}
              aria-pressed={active}
              className={`relative w-full overflow-hidden rounded-3xl border-2 p-5 text-left transition ${
                active
                  ? "border-wine-500 bg-gradient-to-br from-wine-50 to-white shadow-md"
                  : "border-wine-100 bg-white hover:border-wine-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                      active ? "bg-wine-600 text-white" : "bg-wine-50 text-wine-600"
                    }`}
                    aria-hidden
                  >
                    {p.emoji}
                  </span>
                  <div>
                    <p className="font-bold text-ink">{p.name}</p>
                    <p className="text-sm text-ink/55">{p.deliveryLabel}</p>
                  </div>
                </div>
                {p.highlight && (
                  <span className="shrink-0 rounded-full bg-wine-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    🔥 {p.highlight}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-sm text-ink/40 line-through">{formatBRL(p.anchorCents)}</span>
                <span className="text-3xl font-extrabold text-ink">{formatBRL(p.priceCents)}</span>
              </div>

              <ul className="mt-3 space-y-1.5">
                {p.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-ink/70">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-wine-500" fill="currentColor">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" />
                    </svg>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs italic text-ink/45">{p.footnote}</p>
            </button>
          );
        })}
      </div>

      {/*
        Os upsells (vídeo com fotos e karaokê) saíram daqui de propósito:
        estavam sendo COBRADOS sem que nenhuma linha de código os produzisse,
        mostrasse ou entregasse — nem o operador da fila era avisado de que
        tinham sido comprados. Voltam quando existirem de verdade; a definição
        continua em `lib/pricing.ts` e a coluna `orders.upsells` no banco.
      */}

      {/* Resumo + total */}
      <div className="card mt-6 p-5">
        <p className="text-sm font-semibold text-ink">{d.checkout.resumo}</p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between gap-4 text-ink/70">
            <span>
              {occasion?.emoji} {fmt(d.checkout.musicaPara, { nome: draft.recipientName || "—" })}
            </span>
            <span className="whitespace-nowrap">{formatBRL(PLANS.find((p) => p.id === plan)!.priceCents)}</span>
          </li>
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-wine-100 pt-4">
          <span className="font-semibold text-ink">{d.checkout.total}</span>
          <span className="text-2xl font-extrabold text-ink">{formatBRL(total)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          className="btn-primary w-full animate-pulse-soft !py-4 text-base disabled:animate-none"
          onClick={irParaPagamento}
          disabled={indo}
        >
          {indo ? d.checkout.preparando : fmt(d.checkout.irPagamento, { total: formatBRL(total) })}
        </button>
        {erro && <p className="text-center text-sm text-wine-600">{erro}</p>}
        <p className="text-center text-xs text-ink/50">{d.checkout.selo}</p>
        <button onClick={() => router.push("/criar/letra")} className="mx-auto block text-xs text-ink/45 hover:text-ink">
          {d.checkout.voltarLetra}
        </button>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {d.checkout.cards.map((c, i) => (
          <div key={c.t} className="card p-4 text-center">
            <div className="text-xl" aria-hidden>
              {["🛡️", "⚡", "🎁"][i]}
            </div>
            <p className="mt-1.5 text-sm font-semibold text-ink">{c.t}</p>
            <p className="mt-1 text-xs leading-snug text-ink/55">{c.x}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
