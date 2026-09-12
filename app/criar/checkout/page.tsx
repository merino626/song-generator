import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckoutView } from "@/components/wizard/CheckoutView";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export async function generateMetadata(): Promise<Metadata> {
  const d = getDict(await getLocale());
  return { title: `${d.checkout.titulo} — Vira Canção` };
}

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <CheckoutView />
    </>
  );
}
