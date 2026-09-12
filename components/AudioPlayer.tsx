"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Player de áudio próprio, no lugar do `<audio controls>` nativo.
 *
 * O motivo é estrutural, não estético: dentro de um card de ~200–300px (grid
 * de 2–3 colunas), o widget nativo do navegador reparte esse espaço entre
 * play, tempo atual, barra de progresso, duração e volume — a barra de
 * progresso sobra com poucos pixels, e arrastar para um ponto específico da
 * música vira quase impossível.
 *
 * Layout deliberadamente mínimo: só play + barra + tempo, numa linha só. Uma
 * primeira versão incluía botões de avançar/voltar 10s, mas eles competiam
 * pelo mesmo espaço apertado e a barra em si sobrava com 18px de largura —
 * pior que o problema original. Menos controle, mais espaço pro que importa:
 * arrastar para qualquer ponto da música.
 */
export function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [atual, setAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => {
      if (!arrastando) setAtual(el.currentTime);
    };
    const onMeta = () => setDuracao(el.duration || 0);
    const onEnd = () => setTocando(false);

    // A metadata pode carregar (cache local, arquivo pequeno) antes deste
    // efeito grudar o listener — nesse caso o evento já passou e a duração
    // ficaria em 0 para sempre. Por isso confere o estado atual primeiro,
    // em vez de só esperar o evento futuro.
    if (el.readyState >= 1 && el.duration) onMeta();

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [arrastando]);

  function alternar() {
    const el = audioRef.current;
    if (!el) return;
    if (tocando) el.pause();
    else el.play().catch(() => {});
    setTocando(!tocando);
  }

  function buscar(v: number) {
    setAtual(v);
    if (audioRef.current) audioRef.current.currentTime = v;
  }

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div className="mt-3 rounded-xl bg-wine-50/60 p-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={alternar}
          aria-label={tocando ? "Pausar" : "Tocar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wine-600 text-white transition hover:bg-wine-700"
        >
          {tocando ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <rect x="5" y="4" width="3.5" height="12" rx="1" />
              <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4 translate-x-[1px]" fill="currentColor">
              <path d="M6 4.5v11l9-5.5-9-5.5z" />
            </svg>
          )}
        </button>

        {/* Barra de progresso — o que faltava espaço no player nativo. É o
            único elemento flexível da linha: play e tempo têm largura fixa,
            então praticamente todo o resto do card vira espaço de arrastar. */}
        <input
          type="range"
          min={0}
          max={duracao || 0}
          step={0.1}
          value={atual}
          onChange={(e) => buscar(Number(e.target.value))}
          onPointerDown={() => setArrastando(true)}
          onPointerUp={() => setArrastando(false)}
          className="audio-seek h-1.5 min-w-0 flex-1 cursor-pointer"
          aria-label="Posição na música"
        />

        <span className="w-[72px] shrink-0 whitespace-nowrap text-right text-[11px] tabular-nums text-ink/45">
          {fmt(atual)} / {fmt(duracao)}
        </span>
      </div>
    </div>
  );
}
