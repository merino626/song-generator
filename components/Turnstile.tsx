"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";

/**
 * Widget do Cloudflare Turnstile.
 *
 * Renderiza o desafio e devolve o token por `onToken`. Sem
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ele não renderiza nada — assim quem clona o
 * repositório sem chave continua conseguindo rodar o funil.
 *
 * Detalhe que morde: o token é de USO ÚNICO e expira em ~5 min. Se a geração
 * falhar e a pessoa tentar de novo, o mesmo token é recusado pela Cloudflare e
 * ela fica presa num erro que não é culpa dela. Por isso expomos `reset()` —
 * quem chama precisa resetar depois de cada tentativa que falhou.
 */

import { turnstileSiteKey } from "@/lib/turnstile-config";

const SITE_KEY = turnstileSiteKey();
const SCRIPT_ID = "cf-turnstile-script";
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

export type TurnstileHandle = { reset: () => void };

export const turnstileAtivo = () => Boolean(SITE_KEY);

/** Carrega o script uma vez só, mesmo com vários widgets na página. */
function carregarScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();

    const existente = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existente) {
      existente.addEventListener("load", () => resolve());
      existente.addEventListener("error", () => reject(new Error("falha ao carregar Turnstile")));
      return;
    }

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("falha ao carregar Turnstile"));
    document.head.appendChild(s);
  });
}

type Props = {
  onToken: (token: string | undefined) => void;
  /** Chamado quando o desafio expira ou falha — o token anterior não vale mais. */
  onExpirar?: () => void;
};

export const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile({ onToken, onExpirar }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Guardamos os callbacks em ref para o efeito de montagem não depender deles:
  // se dependesse, cada render do pai destruiria e recriaria o widget.
  const cbToken = useRef(onToken);
  const cbExpirar = useRef(onExpirar);
  cbToken.current = onToken;
  cbExpirar.current = onExpirar;

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
        cbToken.current(undefined);
      }
    },
  }));

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let cancelado = false;

    carregarScript()
      .then(() => {
        if (cancelado || !box.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          language: "pt-BR",
          callback: (token: string) => cbToken.current(token),
          "expired-callback": () => {
            cbToken.current(undefined);
            cbExpirar.current?.();
          },
          "error-callback": () => {
            cbToken.current(undefined);
            cbExpirar.current?.();
          },
        });
      })
      .catch((e) => {
        // Cloudflare fora do ar não pode impedir a venda: seguimos sem token e
        // o servidor decide (hoje ele recusa; se preferir degradar, é lá que
        // se muda). Registrar para não virar falha silenciosa.
        console.error("[turnstile]", (e as Error).message);
      });

    return () => {
      cancelado = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={box} className="flex justify-center" />;
});
