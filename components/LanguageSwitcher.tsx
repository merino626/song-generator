"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

/**
 * Troca o idioma gravando o cookie e re-renderizando a árvore de servidor
 * (`router.refresh()`): o layout relê o cookie, o provider recebe o locale
 * novo e tudo — inclusive páginas de servidor — troca de língua sem navegar,
 * sem perder estado de formulário e sem mudar a URL do pedido.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const atual = useLocale();
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  function trocar(para: Locale) {
    if (para === atual) return;
    document.cookie = `${LOCALE_COOKIE}=${para}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={`flex items-center rounded-full border border-wine-200 bg-white/70 p-0.5 text-xs font-medium ${
        pendente ? "opacity-60" : ""
      }`}
      role="group"
      aria-label="Language"
    >
      {(
        [
          ["en", "EN"],
          ["pt", "PT"],
        ] as [Locale, string][]
      ).map(([locale, rotulo]) => (
        <button
          key={locale}
          type="button"
          onClick={() => trocar(locale)}
          aria-pressed={atual === locale}
          className={`rounded-full transition ${compact ? "px-2 py-1" : "px-2.5 py-1"} ${
            atual === locale ? "bg-wine-600 text-white" : "text-ink/55 hover:text-ink"
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
