import { NextResponse } from "next/server";
import { generateLyricsStream, type LyricsInput } from "@/lib/lyrics";
import { checkGenerationLimits, clientIp, deviceIdFrom, newDeviceId } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { isBlocked, recordGeneration, type Identity } from "@/lib/abuse";

/**
 * Geração da letra — a isca gratuita do funil, e por isso o endpoint mais
 * exposto do sistema. Ordem de defesa (do mais barato para o mais caro):
 *   1. tamanho do payload  — corta lixo antes de tocar em banco
 *   2. Turnstile           — separa gente de script
 *   3. rate limit          — IP, dispositivo, fingerprint, e-mail e teto global
 *   4. só então gera
 */

/**
 * O stream leva ~8s (duas letras em paralelo no LLM). O default da Vercel
 * varia por plano e por data do projeto — no Hobby chega a ser 10s, o que
 * cortaria a resposta pela metade. Declarar aqui tira essa incerteza.
 */
export const maxDuration = 60;

const MAX_STORY = 4000;
const MAX_NAME = 120;

export async function POST(request: Request) {
  let input: LyricsInput & { turnstileToken?: string; fingerprint?: string; email?: string };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!input?.recipientName || !input?.story) {
    return NextResponse.json({ error: "Dados insuficientes para gerar a letra" }, { status: 422 });
  }
  if (input.story.length > MAX_STORY || input.recipientName.length > MAX_NAME) {
    return NextResponse.json({ error: "Texto longo demais" }, { status: 413 });
  }

  if (!(await verifyTurnstile(input.turnstileToken, clientIp(request)))) {
    return NextResponse.json(
      { error: "Não conseguimos confirmar que você é uma pessoa. Recarregue a página." },
      { status: 403 },
    );
  }

  // Dispositivo: reaproveita o cookie existente ou cria um agora.
  const existingDevice = deviceIdFrom(request);
  const deviceId = existingDevice ?? newDeviceId();

  const identity: Identity = {
    ip: clientIp(request),
    deviceId,
    fingerprint: input.fingerprint,
    email: input.email,
  };
  const registrar = (blocked: boolean) =>
    recordGeneration({
      identity,
      userAgent: request.headers.get("user-agent") ?? undefined,
      occasion: input.occasion,
      story: input.story,
      blocked,
    });

  // Bloqueio manual/automático tem precedência sobre tudo.
  const block = await isBlocked(identity);
  if (block.blocked) {
    await registrar(true);
    return NextResponse.json(
      { error: "Não foi possível gerar a letra. Se acha que é engano, fale com o suporte." },
      { status: 403 },
    );
  }

  try {
    const verdict = await checkGenerationLimits(request, {
      email: input.email,
      fingerprint: input.fingerprint,
      deviceId,
    });
    if (!verdict.ok) {
      await registrar(true);
      return NextResponse.json(
        { error: verdict.reason },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfterS) } },
      );
    }
  } catch (e) {
    // Banco fora do ar não pode derrubar a venda — mas fica registrado.
    console.error("[rate-limit] indisponível:", (e as Error).message);
  }

  await registrar(false);

  // Resposta em NDJSON (uma linha por evento) em vez de um JSON só no fim:
  // assim a 1ª versão chega à tela na metade do tempo, enquanto a 2ª ainda
  // está sendo escrita. Ver `generateLyricsStream`.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        for await (const { indice, variante } of generateLyricsStream(input)) {
          enviar({ tipo: "variante", indice, variante });
        }
        enviar({ tipo: "fim" });
      } catch (e) {
        // Já mandamos cabeçalho 200, então erro aqui só pode ser comunicado
        // dentro do próprio stream — o cliente trata pelo `tipo`.
        console.error("[generate-lyrics] stream falhou:", (e as Error).message);
        enviar({ tipo: "erro", mensagem: "Não conseguimos escrever a letra agora." });
      } finally {
        controller.close();
      }
    },
  });

  const res = new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Impede buffering em proxy — sem isto o stream chega todo de uma vez
      // e perdemos exatamente o ganho que fomos buscar.
      "X-Accel-Buffering": "no",
    },
  });

  if (!existingDevice) {
    res.cookies.set("vc_did", deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
