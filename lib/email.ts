/**
 * E-mail transacional (Resend).
 *
 * Mesmo padrão de `lib/llm.ts`: fetch puro, sem SDK. Duas regras que valem
 * para todo uso deste módulo:
 *
 *  1. **Falha de e-mail NUNCA derruba a entrega.** A música já está pronta e
 *     acessível pelo link do pedido; não conseguir avisar é um aborrecimento,
 *     não um erro de produção. Por isso `enviar` devolve boolean em vez de
 *     lançar, e quem chama não precisa de try/catch.
 *  2. **Sem chave, vira no-op silencioso** (só loga) — o funil roda em
 *     desenvolvimento sem exigir conta de e-mail configurada.
 */

const BASE = "https://api.resend.com/emails";

/** Remetente. Exige domínio verificado no Resend; o padrão só serve pra teste. */
const FROM = process.env.EMAIL_FROM || "Vira Canção <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function enviar(params: {
  para: string;
  assunto: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY ausente — não enviei "${params.assunto}" para ${params.para}`);
    return false;
  }

  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [params.para], subject: params.assunto, html: params.html }),
      cache: "no-store",
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error(`[email] Resend recusou (${res.status}): ${corpo.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] falha de rede:", (e as Error).message);
    return false;
  }
}

// ------------------------------------------------------------------ modelos

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * HTML de e-mail é propositalmente antiquado: tabela, estilo inline e nada de
 * CSS externo. Cliente de e-mail (Gmail, Outlook) ignora `<style>` e classes.
 */
function layout(titulo: string, corpo: string, botao?: { texto: string; url: string }): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#faf7f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2320">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
    <tr><td>
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#9b6b7a">Vira Canção</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#2b2320">${titulo}</h1>
      ${corpo}
      ${
        botao
          ? `<p style="margin:28px 0 0"><a href="${botao.url}" style="display:inline-block;background:#8c2f45;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:600">${botao.texto}</a></p>
             <p style="margin:16px 0 0;font-size:12px;color:#8a7f7a">Se o botão não abrir, copie este link:<br><span style="color:#8c2f45">${botao.url}</span></p>`
          : ""
      }
    </td></tr>
  </table>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#8a7f7a;text-align:center">
    Você recebeu este e-mail porque encomendou uma música no Vira Canção.
  </p>
</body></html>`;
}

/** Confirmação logo após o pagamento — dá o link antes de a música existir. */
export function emailPagamentoConfirmado(pedido: {
  customer_email: string;
  public_token: string;
  recipient_name?: string | null;
}) {
  const url = `${siteUrl()}/pedido/${pedido.public_token}`;
  return {
    para: pedido.customer_email,
    assunto: "Pagamento confirmado — sua música já está sendo gravada",
    html: layout(
      "Recebemos seu pagamento!",
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">
         A música ${pedido.recipient_name ? `para <strong>${pedido.recipient_name}</strong> ` : ""}entrou em produção agora.
       </p>
       <p style="margin:0;font-size:15px;line-height:1.6">
         Fica pronta em poucos minutos. Assim que estiver, a gente te avisa por aqui — e você
         pode acompanhar em tempo real pelo link abaixo.
       </p>
       <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#6b615c">
         <strong>Guarde este e-mail:</strong> é por este link que você acessa sua música sempre que quiser.
       </p>`,
      { texto: "Acompanhar minha música", url },
    ),
  };
}

/**
 * Avisa que ficou pronta e registra que avisamos.
 *
 * Fica aqui, e não duplicado no robô e na entrega manual, porque os dois
 * caminhos terminam do mesmo jeito — e `delivered_at` existia no schema desde
 * a primeira migration sem nunca ser preenchido por ninguém.
 *
 * Só carimba `delivered_at` se o envio deu certo: assim a coluna significa
 * "o cliente foi avisado", e não "o arquivo existe" (isso já é `ready_at`).
 */
export async function avisarProntoPorEmail(pedido: {
  id: string;
  customer_email?: string | null;
  public_token: string;
  title?: string | null;
  recipient_name?: string | null;
}): Promise<void> {
  if (!pedido.customer_email) return;
  try {
    const ok = await enviar(emailMusicaPronta({ ...pedido, customer_email: pedido.customer_email }));
    if (!ok) return;
    const { supabaseAdmin } = await import("./supabase");
    await supabaseAdmin().from("orders").update({ delivered_at: new Date().toISOString() }).eq("id", pedido.id);
  } catch (e) {
    // A música já está no ar e acessível pelo link — não avisar é chato, não é falha de entrega.
    console.error("[email] aviso de pronta falhou:", (e as Error).message);
  }
}

/** A entrega em si. */
export function emailMusicaPronta(pedido: {
  customer_email: string;
  public_token: string;
  title?: string | null;
  recipient_name?: string | null;
}) {
  const url = `${siteUrl()}/pedido/${pedido.public_token}`;
  return {
    para: pedido.customer_email,
    assunto: `Sua música ficou pronta ${pedido.title ? `— ${pedido.title}` : ""}`.trim(),
    html: layout(
      "Sua música está pronta!",
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">
         ${pedido.title ? `<strong>${pedido.title}</strong>` : "Sua canção"}${
           pedido.recipient_name ? `, para ${pedido.recipient_name},` : ""
         } acabou de sair do estúdio.
       </p>
       <p style="margin:0;font-size:15px;line-height:1.6">
         Gravamos <strong>duas versões</strong> — ouça as duas com calma e fique com a que mais tocar você.
         Dá pra baixar as duas, e a capa também.
       </p>
       <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#6b615c">
         Não ficou como você imaginou? Responda este e-mail que a gente refaz.
       </p>`,
      { texto: "Ouvir minha música", url },
    ),
  };
}
