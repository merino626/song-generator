import { PhotoSlot, AvatarSlot } from "./PhotoSlot";

/**
 * Prova social — TODOS os espaços de mídia abaixo esperam material REAL.
 * Regras (o concorrente errou nas duas):
 *  1. Nada de depoimento inventado — só publicar o que for de cliente real.
 *  2. Nunca expor e-mail/telefone/pedido de cliente em print. Borrar dados
 *     pessoais antes de subir a imagem.
 *
 * Para preencher: coloque os arquivos em /public/prova/ e passe `src`.
 */

const REACTIONS = [
  { label: "Vídeo de reação 1", caption: "Ela ouviu na frente de todo mundo" },
  { label: "Vídeo de reação 2", caption: "A surpresa no aniversário" },
  { label: "Vídeo de reação 3", caption: "Choro na hora do refrão" },
  { label: "Vídeo de reação 4", caption: "A turma cantando junto" },
];

const TESTIMONIALS = [
  { name: "Nome do cliente", occasion: "Declaração de amor", initials: "?" },
  { name: "Nome do cliente", occasion: "Aniversário", initials: "?" },
  { name: "Nome do cliente", occasion: "Zoação", initials: "?" },
];

export function SocialProof() {
  return (
    <section className="border-y border-wine-100 bg-white/60 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wine-600">Prova social</p>
          <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Quem recebeu, sentiu</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink/60">
            As reações são a melhor parte. Veja o que acontece quando a pessoa escuta a própria história virar
            música.
          </p>
        </div>

        {/* Vídeos de reação — formato story, ótimo pra reaproveitar dos Stories/Reels */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REACTIONS.map((r) => (
            <figure key={r.label} className="group">
              <div className="relative">
                <PhotoSlot ratio="story" label={r.label} rounded="rounded-3xl" />
                <span className="pointer-events-none absolute bottom-3 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-white/90 text-wine-600 shadow-md">
                  <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
              <figcaption className="mt-2 text-center text-xs leading-snug text-ink/50">{r.caption}</figcaption>
            </figure>
          ))}
        </div>

        {/* Depoimentos com foto do cliente */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="card p-5">
              <div className="flex gap-0.5 text-gold-500" aria-hidden>
                {"★★★★★".split("").map((s, j) => (
                  <span key={j}>{s}</span>
                ))}
              </div>

              <blockquote className="mt-3 text-sm italic leading-relaxed text-ink/40">
                “[Depoimento real do cliente — substituir após as primeiras vendas.]”
              </blockquote>

              <figcaption className="mt-4 flex items-center gap-3 border-t border-wine-100 pt-4">
                <AvatarSlot initials={t.initials} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink/60">{t.name}</p>
                  <p className="truncate text-xs text-ink/40">{t.occasion}</p>
                </div>
              </figcaption>

              {/* Foto do momento (casal, festa, presente sendo entregue) */}
              <PhotoSlot ratio="video" label="Foto do momento" className="mt-4" />
            </figure>
          ))}
        </div>

        {/* Prints de conversa — a prova social que mais converte no Brasil */}
        <div className="mt-12">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.15em] text-ink/40">
            Mensagens que recebemos
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["Print WhatsApp 1", "Print WhatsApp 2", "Print Instagram", "Print do agradecimento"].map((label) => (
              <PhotoSlot key={label} ratio="portrait" label={label} />
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-ink/40">
            Lembre-se de borrar nome, telefone e e-mail antes de publicar qualquer print.
          </p>
        </div>
      </div>
    </section>
  );
}
