/**
 * Chaves efetivas do Turnstile — compartilhado entre servidor e navegador.
 *
 * Só usa variáveis `NEXT_PUBLIC_`, então pode ser importado dos dois lados sem
 * risco de arrastar segredo para o bundle.
 *
 * MODO DE TESTE: o Turnstile recusa navegador automatizado de propósito (é
 * literalmente o serviço funcionando). Isso impede testar o funil ponta a ponta
 * com Playwright. Ligando `NEXT_PUBLIC_TURNSTILE_TEST=1`, passamos a usar as
 * chaves de demonstração da Cloudflare, que sempre aprovam — o código exercitado
 * é exatamente o mesmo (widget renderiza, token é emitido, servidor valida
 * contra a Cloudflare de verdade), só o veredito é sempre "passou".
 *
 * A TRAVA: o modo de teste só vale quando `NEXT_PUBLIC_SITE_URL` aponta para
 * localhost. Se a flag vazar para a Vercel por descuido, ela é simplesmente
 * ignorada e o captcha real continua valendo — o padrão é sempre proteger.
 */

// Chaves públicas de demonstração da Cloudflare (documentadas, sempre aprovam).
const SITE_KEY_TESTE = "1x00000000000000000000AA";
const SECRET_TESTE = "1x0000000000000000000000000000000AA";

export function modoTesteTurnstile(): boolean {
  if (process.env.NEXT_PUBLIC_TURNSTILE_TEST !== "1") return false;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  return site.includes("localhost") || site.includes("127.0.0.1");
}

/** Chave do site (pública, vai para o navegador). */
export function turnstileSiteKey(): string | undefined {
  if (modoTesteTurnstile()) return SITE_KEY_TESTE;
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

/** Chave secreta — só chame no servidor. */
export function turnstileSecret(): string | undefined {
  if (modoTesteTurnstile()) return SECRET_TESTE;
  return process.env.TURNSTILE_SECRET_KEY;
}
