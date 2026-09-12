/**
 * i18n do site — dicionário tipado próprio, sem biblioteca.
 *
 * Por que não next-intl/rotas com prefixo: o idioma aqui vive num cookie
 * (`vc_lang`), então NENHUMA URL muda — os links `/pedido/<token>` já
 * entregues a clientes continuam válidos, o middleware do admin não precisa
 * ser composto com um middleware de locale, e as rotas de API leem o mesmo
 * cookie para responder erros no idioma certo.
 *
 * O padrão é INGLÊS: o site também é peça de portfólio, e quem avalia
 * portfólio lê em inglês. Brasileiro troca no seletor do cabeçalho (e o
 * cookie lembra). As MÚSICAS seguem o idioma da interface no momento do
 * pedido — pedido feito em inglês gera letra em inglês.
 */

export type Locale = "en" | "pt";

export const LOCALE_COOKIE = "vc_lang";

export function normalizeLocale(v: string | undefined | null): Locale {
  return v === "pt" ? "pt" : "en";
}

/** Locale a partir de um header Cookie cru — para rotas de API. */
export function localeFromCookieHeader(cookieHeader: string | null): Locale {
  const m = (cookieHeader || "").match(/(?:^|;\s*)vc_lang=(\w+)/);
  return normalizeLocale(m?.[1]);
}

/** Interpolação simples: fmt("Passo {n} de {total}", { n: 1, total: 5 }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
