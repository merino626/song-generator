import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./i18n";

/**
 * Locale no lado do servidor (páginas e layouts).
 *
 * Fica em arquivo separado de `lib/i18n.ts` porque `next/headers` não pode
 * entrar em bundle de cliente — e o resto do i18n é usado dos dois lados.
 *
 * Atenção ao efeito colateral: ler cookie torna a página DINÂMICA (deixa de
 * ser pré-renderizada). Para este site é aceitável — a landing já carrega
 * leve e o resto do funil é dinâmico por natureza.
 */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return normalizeLocale(jar.get(LOCALE_COOKIE)?.value);
}
