"use client";

/**
 * Impressão digital leve do dispositivo (sem biblioteca externa).
 *
 * Combina sinais que quase não mudam no mesmo aparelho/navegador: resolução,
 * fuso, idioma, núcleos, plataforma e um render de canvas (que varia conforme
 * GPU/fontes). Não é identidade — é só um "mesmo aparelho, provavelmente".
 *
 * Sozinho não segura ninguém determinado (aba anônima e outro navegador geram
 * outro hash). O papel dele é encarecer o abuso casual e, principalmente,
 * evitar que a gente bloqueie gente inocente que divide o IP (CGNAT).
 */

const KEY = "vc.fp.v1";

function canvasSignal(): string {
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("vira-cancao", 2, 15);
    return c.toDataURL().slice(-64);
  } catch {
    return "canvas-err";
  }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function getFingerprint(): Promise<string> {
  try {
    const cached = localStorage.getItem(KEY);
    if (cached) return cached;
  } catch {
    /* modo privado pode bloquear storage */
  }

  const n = navigator as any;
  const parts = [
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    (navigator.languages || []).join(","),
    n.hardwareConcurrency ?? "",
    n.deviceMemory ?? "",
    n.platform ?? "",
    navigator.userAgent,
    canvasSignal(),
  ].join("|");

  const fp = await sha256(parts);
  try {
    localStorage.setItem(KEY, fp);
  } catch {
    /* ignora */
  }
  return fp;
}
