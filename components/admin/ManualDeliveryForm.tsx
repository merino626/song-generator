"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { concluirManual, type ManualState } from "@/app/admin/fila/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>
      {pending ? "Enviando…" : "Concluir e liberar para o cliente"}
    </button>
  );
}

/**
 * Formulário de entrega manual — client component só para poder desabilitar
 * o botão enquanto envia (`useFormStatus`) e mostrar erro na tela
 * (`useActionState`). Sem isso, um segundo clique durante o primeiro envio
 * duplicava as faixas do cliente, porque nada impedia a segunda submissão.
 */
export function ManualDeliveryForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState<ManualState, FormData>(concluirManual, null);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input name="audio1" required className="field !py-2 text-sm" placeholder="Link do MP3 (versão 1) — obrigatório" />
      <input name="audio2" className="field !py-2 text-sm" placeholder="Link do MP3 (versão 2) — opcional" />
      <div className="flex flex-wrap gap-2">
        <input name="capa" className="field !py-2 flex-1 text-sm" placeholder="Link da capa (opcional)" />
        <input name="operador" className="field !py-2 w-32 text-sm" placeholder="seu nome" />
      </div>
      <SubmitButton />
      {state?.error && <p className="text-xs font-medium text-wine-600">{state.error}</p>}
    </form>
  );
}
