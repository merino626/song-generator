"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useDraft } from "@/lib/draft";
import { formatBRL, totalCents, type PlanId, type UpsellId } from "@/lib/pricing";
import { useDict, useLocale } from "@/components/LocaleProvider";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// Uma promessa só, reaproveitada por todo o app — carregar Stripe.js de novo
// a cada montagem do componente refaria um GET evitável.
const stripePromise = PUBLIC_KEY ? loadStripe(PUBLIC_KEY) : null;

export function PagamentoView() {
  const router = useRouter();
  const { draft, ready } = useDraft();
  const d = useDict();
  const locale = useLocale();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [erroInicial, setErroInicial] = useState<string | null>(null);
  const pediu = useRef(false);

  useEffect(() => {
    if (ready && !draft.orderId) router.replace("/criar/checkout");
  }, [ready, draft.orderId, router]);

  // Cria o PaymentIntent assim que o pedido existe. `pediu` impede que o
  // StrictMode (que monta componentes duas vezes em dev) dispare duas
  // criações — a rota já reaproveita um intent pendente, mas evita a
  // corrida de qualquer forma.
  useEffect(() => {
    if (!ready || !draft.orderId || pediu.current || !PUBLIC_KEY) return;
    pediu.current = true;
    (async () => {
      try {
        const res = await fetch("/api/checkout/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: draft.orderId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || d.pagamento.erroGenerico);
        setClientSecret(data.clientSecret);
      } catch (e) {
        setErroInicial((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, draft.orderId]);

  const total = totalCents((draft.plan ?? "priority") as PlanId, (draft.upsells ?? []) as UpsellId[]);

  if (!ready || !draft.orderId) return <div className="py-24 text-center text-ink/40">{d.wizard.carregando}</div>;

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-ink">{d.pagamento.titulo}</h1>
        <p className="mt-2 text-sm text-ink/60">{d.pagamento.sub}</p>
      </div>

      <div className="card mt-8 p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink/60">{d.pagamento.totalPagar}</span>
          <span className="text-3xl font-extrabold text-ink">{formatBRL(total)}</span>
        </div>

        {!PUBLIC_KEY ? (
          <div className="mt-6 rounded-2xl border border-dashed border-wine-300 bg-wine-50/50 p-6 text-center text-sm text-ink/55">
            <strong className="font-semibold text-wine-700">{d.pagamento.naoConfigurado}</strong>
            <p className="mt-2">{d.pagamento.naoConfiguradoDetalhe}</p>
          </div>
        ) : erroInicial ? (
          <p className="mt-6 text-center text-sm text-wine-600">{erroInicial}</p>
        ) : clientSecret && stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              locale: locale === "pt" ? "pt-BR" : "en",
              appearance: { theme: "stripe", variables: { colorPrimary: "#9d2f4a", borderRadius: "12px" } },
            }}
          >
            <FormularioPagamento publicToken={draft.publicToken} />
          </Elements>
        ) : (
          <div className="mt-6 flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-wine-300 border-t-wine-600" />
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/criar/checkout")}
        className="mx-auto mt-6 block text-xs text-ink/45 hover:text-ink"
      >
        {d.pagamento.voltarResumo}
      </button>
    </main>
  );
}

/**
 * Fica dentro de `<Elements>` de propósito: `useStripe`/`useElements` só
 * existem no contexto que o provedor cria, e o provedor só existe depois que
 * temos o `clientSecret` — daí o componente separado, em vez de tudo junto
 * no `PagamentoView`.
 */
function FormularioPagamento({ publicToken }: { publicToken?: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const d = useDict();
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Confere no nosso servidor (que reconfere na Stripe) antes de redirecionar. */
  async function confirmarEIrPara(token?: string) {
    if (!token) return;
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(`/api/checkout/status?token=${token}`, { cache: "no-store" });
        const data = await r.json();
        if (data.status && data.status !== "awaiting_payment") {
          router.push(`/pedido/${token}`);
          return;
        }
      } catch {
        /* tenta de novo */
      }
      await new Promise((res) => setTimeout(res, 700));
    }
    // As tentativas rápidas não bastaram — o polling abaixo assume dali pra frente.
  }

  // Rede de segurança: cobre o caso raro de a confirmação demorar mais que
  // as tentativas rápidas de `confirmarEIrPara` (ex.: 3D Secure levando um
  // instante a mais do lado da Stripe). Mesmo princípio do polling já usado
  // na página do pedido — nunca confiar só num mecanismo de notificação.
  useEffect(() => {
    if (!enviando || !publicToken) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/checkout/status?token=${publicToken}`, { cache: "no-store" });
        const data = await r.json();
        if (data.status && data.status !== "awaiting_payment") router.push(`/pedido/${publicToken}`);
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [enviando, publicToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setErro(null);
    // Diferente do Brick do MP: aqui é O NOSSO código que chama
    // `stripe.confirmPayment`, e a Stripe exige o Payment Element MONTADO
    // durante toda a chamada (ela pode precisar dele até pra um desafio de
    // 3D Secure em cima do próprio formulário). `enviando` só desabilita o
    // botão — o formulário continua na tela até termos uma resposta.
    setEnviando(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Exigido pela API mesmo com `redirect: "if_required"` — só é usado se
      // algum método específico precisar de navegação de página de verdade
      // (não é o caso do cartão simples; 3D Secure usa um desafio na própria
      // tela, sem sair daqui). Volta pra esta mesma página se acontecer.
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      setEnviando(false);
      setErro(error.message || d.pagamento.recusado);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // SÓ AGORA é seguro tirar o Payment Element da tela — a Stripe já
      // terminou de usá-lo. Isto evita o formulário "voltar" por um instante
      // entre a confirmação e o redirect (mesmo problema que já tínhamos
      // corrigido no Brick do MP, resolvido no momento certo desta vez).
      setConfirmado(true);
      await confirmarEIrPara(publicToken);
      return;
    }

    // requires_action / processing / etc. sem erro — raro com cartão simples;
    // o polling acima assume a partir daqui, sem travar o formulário.
    setEnviando(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      {confirmado ? (
        <div className="rounded-2xl bg-wine-50/60 p-10 text-center text-sm text-ink/60">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-wine-300 border-t-wine-600" />
          {d.pagamento.processando}
        </div>
      ) : (
        <>
          <PaymentElement />
          <button type="submit" disabled={!stripe || enviando} className="btn-primary mt-5 w-full !py-3.5">
            {enviando ? (
              <span className="inline-flex items-center gap-2.5">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {d.pagamento.processando}
              </span>
            ) : (
              d.pagamento.pagar
            )}
          </button>
        </>
      )}
      {erro && <p className="mt-4 text-center text-sm text-wine-600">{erro}</p>}
    </form>
  );
}
