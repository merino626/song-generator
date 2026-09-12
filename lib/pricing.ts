/** Planos e upsells. Valores em centavos pra evitar float. */

export type PlanId = "standard" | "priority";

export type Plan = {
  id: PlanId;
  name: string;
  emoji: string;
  priceCents: number;
  /** Preço "de" (âncora) exibido riscado */
  anchorCents: number;
  deliveryLabel: string;
  highlight?: string;
  benefits: string[];
  footnote: string;
};

/**
 * Os dois planos.
 *
 * O prazo comunicado mudou de "1h / 6h" para "minutos" porque era o que já
 * acontecia na prática: a produção leva ~2 minutos. Vender 6 horas entregava
 * MUITO abaixo do possível e ainda perdia na comparação com o concorrente,
 * que anuncia 15–20 min.
 *
 * Com os dois planos rápidos, o que o prioritário vende deixa de ser
 * velocidade e passa a ser **garantia**: prazo máximo com hora marcada e
 * preferência na fila quando algo precisa de gente (o robô falhando é o único
 * caso em que o tempo varia de verdade). Essa preferência é real — a fila do
 * admin ordena por plano em `app/admin/fila/page.tsx`.
 *
 * A entrega é pela página do pedido; não prometemos e-mail nem WhatsApp
 * enquanto não existirem.
 */
export const PLANS: Plan[] = [
  {
    id: "priority",
    name: "Prioritária",
    emoji: "⚡",
    priceCents: 999,
    anchorCents: 2490,
    deliveryLabel: "Pronta em minutos, com prazo garantido",
    highlight: "Mais escolhida",
    benefits: [
      "Pronta em poucos minutos",
      "Prazo garantido de 1 hora, mesmo se algo travar",
      "Na frente da fila em qualquer imprevisto",
      "Revisão da letra inclusa",
    ],
    footnote: "Ideal para surpresas de última hora e datas que são hoje.",
  },
  {
    id: "standard",
    name: "Padrão",
    emoji: "🕒",
    priceCents: 599,
    anchorCents: 1490,
    deliveryLabel: "Pronta em minutos",
    benefits: [
      "Pronta em poucos minutos",
      "Produção completa e personalizada",
      "Revisão da letra inclusa",
    ],
    footnote: "A mesma música e a mesma qualidade — sem prazo garantido por escrito.",
  },
];

export type UpsellId = "video" | "karaoke";

export type Upsell = {
  id: UpsellId;
  name: string;
  emoji: string;
  priceCents: number;
  description: string;
  benefits: string[];
};

export const UPSELLS: Upsell[] = [
  {
    id: "video",
    name: "Vídeo com as suas fotos",
    emoji: "🎥",
    priceCents: 4790,
    description: "Transforme a música num vídeo emocionante pra postar e compartilhar",
    benefits: ["Slideshow com as fotos de vocês", "Letra sincronizada na tela", "Formato pronto pra status e redes"],
  },
  {
    id: "karaoke",
    name: "Versão Karaokê",
    emoji: "🎤",
    priceCents: 3990,
    description: "Pra cantar junto na hora da surpresa",
    benefits: ["Vídeo com a letra sincronizada", "Versão instrumental exclusiva (sem voz)", "Perfeito pra festa"],
  },
];

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id)!;
}

export function totalCents(planId: PlanId, upsells: UpsellId[]): number {
  return (
    getPlan(planId).priceCents +
    UPSELLS.filter((u) => upsells.includes(u.id)).reduce((sum, u) => sum + u.priceCents, 0)
  );
}
