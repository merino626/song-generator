"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { getDict, type Dict } from "@/lib/dict";

/**
 * Entrega o locale (lido do cookie pelo layout, no servidor) para qualquer
 * componente de cliente. O dicionário é resolvido AQUI no cliente a partir do
 * import estático — só o `locale` (2 bytes) atravessa a fronteira RSC, em vez
 * do dicionário inteiro serializado no payload de toda página.
 */
const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useDict(): Dict {
  return getDict(useContext(LocaleContext));
}
