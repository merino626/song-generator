/**
 * Provider crun.ai (agregador que revende a Suno).
 *
 * Validado em 08/08/2026 com geração real em PT-BR:
 *  - auth é `x-api-key` (Bearer só vale no endpoint de LLMs)
 *  - model "suno/music-generate", input.model "v5.5" -> retorna chirp-fenix
 *  - 12 créditos por geração, ~86s, devolve 2 faixas + capa
 */

import type { MusicProvider, MusicRequest, MusicResult, MusicTrack } from "./types";
import { ProviderError } from "./types";

const BASE = process.env.CRUN_BASE_URL || "https://api.crun.ai";
const VERSION = process.env.CRUN_MUSIC_VERSION || "v5.5";

function apiKey(): string {
  const k = process.env.CRUN_API_KEY;
  if (!k) throw new ProviderError("CRUN_API_KEY não configurada", false);
  return k;
}

async function call(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "x-api-key": apiKey(), "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch (e) {
    // rede caiu: vale tentar de novo antes de mandar pro manual
    throw new ProviderError(`falha de rede ao chamar crun: ${(e as Error).message}`, true);
  }

  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ProviderError(`resposta não-JSON do crun (${res.status}): ${text.slice(0, 200)}`, res.status >= 500);
  }

  if (!res.ok || (body?.code && body.code !== 200)) {
    const msg = body?.message || `HTTP ${res.status}`;
    // 401/402 (chave inválida, sem crédito) não adianta repetir — vai pro manual.
    const retryable = res.status >= 500 || res.status === 429;
    throw new ProviderError(`crun: ${msg}`, retryable);
  }
  return body;
}

export const crunProvider: MusicProvider = {
  name: "crun",

  async create(req: MusicRequest, opts) {
    const input: Record<string, unknown> = {
      mode: "custom",
      model: VERSION,
      instrumental: false,
      title: req.title,
      tags: req.tags,
      lyrics: req.lyrics,
    };
    // "dueto" não tem equivalente: omitimos e deixamos o motor escolher.
    if (req.vocalGender) input.vocal_gender = req.vocalGender;

    const body = await call("/api/v1/client/job/CreateTask", {
      method: "POST",
      body: JSON.stringify({
        model: "suno/music-generate",
        callback_url: opts?.callbackUrl ?? "",
        input,
      }),
    });

    const externalId = body?.data?.task_id;
    if (!externalId) throw new ProviderError("crun não devolveu task_id", false);
    return { externalId };
  },

  async status(externalId: string): Promise<MusicResult> {
    const body = await call(`/api/v1/client/job/TaskInfo?task_id=${encodeURIComponent(externalId)}`);
    const d = body?.data;
    const state = d?.status;

    if (state === "success") {
      const tracks: MusicTrack[] = (d?.result?.suno_data ?? []).map((t: any) => ({
        externalId: t.suno_id,
        title: t.title,
        audioUrl: t.suno_audio_url,
        coverUrl: t.suno_image_large_url || t.suno_image_url,
        durationS: t.duration,
      }));
      if (!tracks.length) return { state: "failed", externalId, error: "sucesso sem faixas no retorno" };
      return { state: "success", externalId, tracks, creditsUsed: d?.credits };
    }

    if (state === "failed" || state === "error") {
      return { state: "failed", externalId, error: d?.result?.message || d?.message || "falha no provider" };
    }

    return { state: "running", externalId };
  },
};
