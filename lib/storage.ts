import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

// Storage de imagens do Timbre — mesmo R2 (S3-compatível) do spa-sapienza, mesmas envs
// S3_*. As capas de evento ficam em `timbre/events/<eventId>/`, separadas das finalidades
// do CMS (articles/, social/…). Só roda no servidor (rotas-proxy), nunca no navegador.
const {
  S3_ENDPOINT,
  S3_REGION,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_PUBLIC_URL,
} = process.env

export function isStorageConfigured(): boolean {
  return Boolean(
    S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_PUBLIC_URL,
  )
}

let client: S3Client | null = null
function getClient(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error('Storage S3/R2 não configurado (ver envs S3_*).')
  }
  client ??= new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID!,
      secretAccessKey: S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // necessário para R2/MinIO
  })
  return client
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// Sobe a capa de um evento e devolve a key + URL pública (S3_PUBLIC_URL/key).
export async function uploadEventCover(
  eventId: string,
  body: Buffer,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const ext = EXT[contentType]
  const key = `timbre/events/${eventId}/${randomUUID()}.${ext}`
  await getClient().send(
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
  )
  return { key, url: `${S3_PUBLIC_URL!.replace(/\/$/, '')}/${key}` }
}

// Remove um objeto do bucket (limpeza de upload que falhou no vínculo).
export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
}
