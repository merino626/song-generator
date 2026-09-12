/**
 * Cloudflare Turnstile — prova de que é gente, não script.
 *
 * Fica desligado enquanto `TURNSTILE_SECRET_KEY` não existir, para não travar o
 * desenvolvimento. Em produção é obrigatório: é a camada que impede o bot de
 * chegar no rate limit em primeiro lugar.
 */

import { turnstileSecret } from "./turnstile-config";

export const turnstileEnabled = () => Boolean(turnstileSecret());

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = turnstileSecret();
  if (!secret) return true; // desligado
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      cache: "no-store",
    });
    const data = await res.json();
    return data?.success === true;
  } catch {
    return false;
  }
}
