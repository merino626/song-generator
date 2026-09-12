import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MeusPedidosForm } from "@/components/MeusPedidosForm";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const d = getDict(await getLocale());
  return { title: `${d.meusPedidos.titulo} — Vira Canção` };
}

/**
 * Consulta de pedidos pelo e-mail, direto — sem magic link.
 *
 * Troca deliberada: quem sabe o e-mail vê os pedidos dele. Ganha atrito zero
 * (a pessoa que perdeu o link recupera na hora, sem depender de a caixa de
 * entrada colaborar) e paga com privacidade. A trava de enumeração fica no
 * endpoint, em `app/api/meus-pedidos/route.ts`.
 */
export default async function MeusPedidosPage() {
  const d = getDict(await getLocale());

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h1 className="font-serif text-3xl text-ink">{d.meusPedidos.titulo}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">{d.meusPedidos.sub}</p>
        </div>

        <MeusPedidosForm />
      </main>

      <SiteFooter />
    </>
  );
}
