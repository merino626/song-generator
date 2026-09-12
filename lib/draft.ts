"use client";

import { useCallback, useEffect, useState } from "react";
import type { VocalGender } from "./music-styles";
import type { PlanId, UpsellId } from "./pricing";

/** Rascunho do pedido — vive no localStorage até existir backend. */
export type Draft = {
  occasion?: string;
  recipientName?: string;
  /** Gênero de quem recebe — usado para acertar a concordância na letra (PT-BR). */
  recipientGender?: "f" | "m" | "n";
  relationship?: string;
  senderName?: string;
  story?: string;
  styleId?: string;
  vocal?: VocalGender;
  email?: string;
  phone?: string;
  /** Preenchido após a geração */
  lyricsVariants?: { title: string; lyrics: string }[];
  chosenVariant?: number;
  editedLyrics?: string;
  /**
   * Token do Turnstile resolvido no wizard, entregue à tela da letra.
   *
   * A geração acontece LÁ, não aqui: o stream (que traz a 1ª versão antes da
   * 2ª) morreria no instante em que a página navegasse. Como o token é de uso
   * único e vale ~5 min, ele é consumido e apagado assim que o stream começa.
   */
  captchaToken?: string;
  /** Hash do aparelho, calculado no wizard e reaproveitado na tela da letra. */
  fingerprint?: string;
  plan?: PlanId;
  upsells?: UpsellId[];
  /** Preenchidos ao criar o pedido no banco (passo do checkout) */
  orderId?: string;
  publicToken?: string;
};

const KEY = "vc.draft.v1";

export function loadDraft(): Draft {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") as Draft;
  } catch {
    return {};
  }
}

export function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/**
 * Hook do rascunho. `ready` evita flash de conteúdo errado na hidratação —
 * o localStorage só existe depois que o componente monta no cliente.
 */
export function useDraft() {
  const [draft, setDraft] = useState<Draft>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(loadDraft());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearDraft();
    setDraft({});
  }, []);

  return { draft, update, reset, ready };
}
