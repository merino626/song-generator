import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) — onde a mídia final mora.
 *
 * Por que re-hospedar em vez de servir a URL do provider: a CDN do crun/Suno é
 * temporária e fora do nosso controle. Se o link expirar (ou o fornecedor
 * sumir), o cliente perde a música que pagou. No R2 o egress é zero e o arquivo
 * é nosso.
 */

let client: S3Client | null = null;

function r2(): S3Client {
  if (client) return client;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 não configurado");
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return client;
}

export function r2Configured(): boolean {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}

const bucketName = () => process.env.R2_BUCKET || "vira-cancao";

/**
 * Guardamos a CHAVE do objeto, não uma URL.
 *
 * O endpoint S3 do R2 não é público (responde 400 sem assinatura), e um bucket
 * aberto entregaria de graça o que o cliente pagou. Então o banco guarda
 * `r2://chave` e a URL de download é assinada na hora, pelo `/api/media`,
 * depois de conferir que o pedido está pago.
 */
export function r2Ref(key: string): string {
  return `r2://${key}`;
}

export function keyFromRef(ref: string): string | null {
  return ref.startsWith("r2://") ? ref.slice(5) : null;
}

/** URL temporária de download (padrão: 1 hora). */
export async function signedUrl(key: string, expiresInS = 3600): Promise<string> {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: bucketName(), Key: key }), { expiresIn: expiresInS });
}

/** Baixa a mídia do provider e sobe no nosso bucket. Devolve a referência `r2://chave`. */
export async function mirrorToR2(sourceUrl: string, key: string, contentType: string): Promise<string> {
  const res = await fetch(sourceUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`falha ao baixar mídia (${res.status})`);
  const body = Buffer.from(await res.arrayBuffer());

  await r2().send(
    new PutObjectCommand({ Bucket: bucketName(), Key: key, Body: body, ContentType: contentType }),
  );

  return r2Ref(key);
}
