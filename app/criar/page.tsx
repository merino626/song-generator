import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { CriarWizard } from "@/components/wizard/CriarWizard";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/dict";

export async function generateMetadata(): Promise<Metadata> {
  const d = getDict(await getLocale());
  return { title: `${d.nav.criar} — Vira Canção` };
}

export default async function CriarPage() {
  const d = getDict(await getLocale());
  return (
    <>
      <SiteHeader />
      {/* useSearchParams exige Suspense pra não forçar render dinâmico do app todo */}
      <Suspense fallback={<div className="py-24 text-center text-ink/40">{d.wizard.carregando}</div>}>
        <CriarWizard />
      </Suspense>
    </>
  );
}
