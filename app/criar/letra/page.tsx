import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { LetraView } from "@/components/wizard/LetraView";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export async function generateMetadata(): Promise<Metadata> {
  const d = getDict(await getLocale());
  return { title: `${d.letra.titulo} — Vira Canção` };
}

export default function LetraPage() {
  return (
    <>
      <SiteHeader />
      <LetraView />
    </>
  );
}
