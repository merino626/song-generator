import Link from "next/link";
import { Pencil, Headphones, Shield, MessageCircle, FileText } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OccasionGrid } from "@/components/OccasionGrid";
import { PlanCards } from "@/components/PlanCards";
import { Faq } from "@/components/Faq";
import { PhotoSlot } from "@/components/PhotoSlot";
import { AudioPlayer } from "@/components/AudioPlayer";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

/**
 * Demos da seção "Exemplos": três GERAÇÕES INDEPENDENTES, cada uma de uma
 * história e um estilo diferentes (`scripts/gerar-demos.js`). Substituíram os
 * mp3 antigos, que eram três recortes da MESMA geração apresentados como
 * produtos distintos — e um deles era karaokê, que nem vendemos mais.
 * Títulos/legendas vêm do dicionário (mesma ordem deste array).
 */
const DEMOS = [
  { src: "/samples/demo-sertanejo.mp3", capa: "/img/capa-sertanejo.jpg" },
  { src: "/samples/demo-forro.mp3", capa: "/img/capa-festa.jpg" },
  { src: "/samples/demo-zoacao.mp3", capa: "/img/capa-zoacao.jpg" },
];

const FOTOS_HERO = [
  { src: "/img/casal.jpg", alt: "casal" as const, className: "sm:mt-6" },
  { src: "/img/aniversario.jpg", alt: "aniversario" as const, className: "" },
  { src: "/img/familia.jpg", alt: "familia" as const, className: "sm:-mt-3" },
  { src: "/img/amigos.jpg", alt: "amigos" as const, className: "hidden sm:block" },
  { src: "/img/surpresa.jpg", alt: "surpresa" as const, className: "hidden sm:mt-6 sm:block" },
];

const DIF_ICONS = [Pencil, Headphones, Shield];
const ICONS_COMO = [MessageCircle, FileText, Headphones];

export default async function HomePage() {
  const d = getDict(await getLocale());

  return (
    <>
      <SiteHeader />

      <main>
        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(224,155,168,.28),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine-200 bg-white/70 px-4 py-1.5 text-xs font-medium text-wine-700">
              {d.landing.badge}
            </span>

            <h1 className="mt-6 font-serif text-4xl leading-[1.1] text-ink sm:text-6xl">
              {d.landing.h1Pre} <span className="text-wine-600">{d.landing.h1Destaque}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/65 sm:text-lg">
              {d.landing.sub}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/criar" className="btn-primary w-full !px-8 !py-4 text-base sm:w-auto">
                {d.landing.ctaCriar}
              </Link>
              <a href="#exemplos" className="btn-secondary w-full !px-8 !py-4 text-base sm:w-auto">
                {d.landing.ctaOuvir}
              </a>
            </div>

            <p className="mt-5 text-sm text-ink/50">
              {d.landing.nota1}
              <strong className="font-semibold text-ink/70">{d.landing.notaStrong}</strong>
              {d.landing.nota2}
            </p>

            {/* Mosaico de clima. Imagens ILUSTRATIVAS geradas por IA
                (`scripts/gerar-imagens.js`) — nenhuma legenda afirma que são
                clientes, e não pode passar a afirmar. */}
            <div className="mt-12 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {FOTOS_HERO.map((f) => (
                <PhotoSlot key={f.src} ratio="portrait" src={f.src} alt={d.landing.altFotos[f.alt]} className={f.className} />
              ))}
            </div>

            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              {d.landing.difs.map((dif, i) => {
                const Icon = DIF_ICONS[i];
                return (
                  <div key={dif.t} className="card flex items-start gap-3 p-4">
                    <Icon className="h-5 w-5 shrink-0 text-wine-600" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-ink">{dif.t}</p>
                      <p className="text-xs leading-snug text-ink/55">{dif.x}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- COMO FUNCIONA ---------- */}
        <section id="como-funciona" className="scroll-mt-20 border-y border-wine-100 bg-white/60 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wine-600">{d.landing.como.eyebrow}</p>
              <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{d.landing.como.titulo}</h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {d.landing.como.passos.map((s, i) => {
                const Icon = ICONS_COMO[i];
                return (
                  <div key={s.t} className="relative">
                    <div className="card h-full p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-wine-600 text-lg font-bold text-white">
                        {i + 1}
                      </div>
                      <h3 className="mt-4 flex items-center gap-2 font-serif text-xl text-ink">
                        <Icon className="h-5 w-5 shrink-0 text-wine-600" aria-hidden />
                        {s.t}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink/60">{s.x}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- OCASIÕES ---------- */}
        <section id="ocasioes" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wine-600">
                {d.landing.ocasioes.eyebrow}
              </p>
              <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{d.landing.ocasioes.titulo}</h2>
              <p className="mx-auto mt-3 max-w-xl text-ink/60">{d.landing.ocasioes.sub}</p>
            </div>

            <div className="mt-10">
              <OccasionGrid />
            </div>
          </div>
        </section>

        {/* ---------- EXEMPLOS ---------- */}
        <section id="exemplos" className="scroll-mt-20 border-y border-wine-100 bg-white/60 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wine-600">
                {d.landing.exemplos.eyebrow}
              </p>
              <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{d.landing.exemplos.titulo}</h2>
              <p className="mx-auto mt-3 max-w-xl text-ink/60">{d.landing.exemplos.sub}</p>
            </div>

            {/* 2 colunas no tablet, 3 só a partir de lg — 3 colunas a partir
                de sm (640px) deixava cada player estreito demais para o
                scrubber de progresso ter espaço de verdade. */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DEMOS.map((demo, i) => {
                const item = d.landing.exemplos.itens[i];
                return (
                  <div key={demo.src} className="card p-5">
                    <div className="relative">
                      <PhotoSlot ratio="square" src={demo.capa} alt={item.titulo} rounded="rounded-2xl" />
                      <div
                        className="absolute bottom-2 left-2 flex items-end gap-1 rounded-full bg-white/85 px-2.5 py-1.5"
                        aria-hidden
                      >
                        {[8, 14, 20, 12, 16].map((h, j) => (
                          <span
                            key={j}
                            className="w-1 origin-bottom rounded-full bg-wine-500 animate-equalize"
                            style={{ height: `${h}px`, animationDelay: `${j * 0.12}s` }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-4 font-serif text-lg text-ink">{item.titulo}</p>
                    <p className="mt-0.5 text-xs text-ink/50">{item.legenda}</p>
                    <AudioPlayer src={demo.src} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- PREÇOS ---------- */}
        <section id="precos" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wine-600">{d.landing.precos.eyebrow}</p>
              <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{d.landing.precos.titulo}</h2>
              <p className="mx-auto mt-3 max-w-xl text-ink/60">{d.landing.precos.sub}</p>
            </div>

            <div className="mt-10">
              <PlanCards />
            </div>
          </div>
        </section>

        {/* Prova social continua fora do ar até existirem clientes de verdade
            (ver components/SocialProof.tsx). */}

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wine-600">{d.landing.faq.eyebrow}</p>
              <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{d.landing.faq.titulo}</h2>
            </div>
            <div className="mt-10">
              <Faq />
            </div>
          </div>
        </section>

        {/* ---------- CTA FINAL ---------- */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-wine-600 to-wine-800 px-6 py-14 text-center text-white shadow-lg">
            <h2 className="font-serif text-3xl sm:text-4xl">{d.landing.cta.titulo}</h2>
            <p className="mx-auto mt-4 max-w-lg text-white/80">{d.landing.cta.sub}</p>
            <Link
              href="/criar"
              className="btn mt-8 bg-white !px-8 !py-4 text-base font-bold text-wine-700 hover:bg-wine-50"
            >
              {d.landing.cta.botao}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
