/**
 * Contrato do motor de música.
 *
 * Todo provider (crun.ai hoje; outra API ou manual amanhã) implementa isso.
 * O resto do sistema nunca fala com um provider específico — é o que nos deixa
 * trocar de fornecedor sem reescrever produto, e é o que sustenta o modo híbrido.
 */

export type MusicRequest = {
  title: string;
  /** Letra final, já revisada/editada pelo cliente */
  lyrics: string;
  /** Tags de estilo (ex.: "sertanejo romântico, viola caipira, voz feminina") */
  tags: string;
  /** Gênero do vocal — "dueto" vira indefinido e o motor decide */
  vocalGender?: "f" | "m";
};

export type MusicTrack = {
  externalId: string;
  title: string;
  audioUrl: string;
  coverUrl?: string;
  durationS?: number;
};

export type MusicResult =
  | { state: "running"; externalId: string }
  | { state: "success"; externalId: string; tracks: MusicTrack[]; creditsUsed?: number }
  | { state: "failed"; externalId?: string; error: string };

export interface MusicProvider {
  readonly name: string;
  /** Enfileira a geração e devolve o id externo para acompanhamento */
  create(req: MusicRequest, opts?: { callbackUrl?: string }): Promise<{ externalId: string }>;
  /** Consulta o estado atual */
  status(externalId: string): Promise<MusicResult>;
}

/** Erro que o orquestrador entende como "cai pro manual". */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
