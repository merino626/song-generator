import { NextResponse } from "next/server";
import { deliverManual } from "@/lib/delivery";

/**
 * Conclusão manual por API (para automação/scripts). O caminho normal é o
 * formulário em /admin/fila — os dois usam a mesma função de entrega.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const result = await deliverManual({
      orderId: body?.orderId,
      urls: body?.urls ?? [body?.audioUrl].filter(Boolean),
      capa: body?.coverUrl,
      operador: body?.operator,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
