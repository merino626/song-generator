import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PedidoView } from "@/components/PedidoView";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const d = getDict(await getLocale());
  return {
    title: `${d.pedido.tituloPagina} — Vira Canção`,
    // O link é compartilhado por WhatsApp; não queremos que caia em busca.
    robots: { index: false, follow: false },
  };
}

export default async function PedidoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  const res = await fetch(`${proto}://${host}/api/pedido/${token}`, { cache: "no-store" });

  if (!res.ok) notFound();

  return (
    <>
      <SiteHeader />
      <PedidoView token={token} inicial={await res.json()} />
      <SiteFooter />
    </>
  );
}
