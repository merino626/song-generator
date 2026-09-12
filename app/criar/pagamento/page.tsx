import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { PagamentoView } from "@/components/wizard/PagamentoView";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export async function generateMetadata(): Promise<Metadata> {
  const d = getDict(await getLocale());
  return { title: `${d.pagamento.titulo} — Vira Canção` };
}

export default function PagamentoPage() {
  return (
    <>
      <SiteHeader />
      <PagamentoView />
    </>
  );
}
