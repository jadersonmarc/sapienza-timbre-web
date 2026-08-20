import { API_BASE, getProducerToken } from '@/lib/producer-session'
import { deleteObject, isStorageConfigured, uploadEventCover } from '@/lib/storage'

// Upload da capa (multipart): sobe para o R2 e grava a cover_url no evento via Go (o PATCH
// do Go é owner-only e escopado ao tenant — é ele quem valida posse). Capa é opcional; o
// campo de URL externa continua valendo.
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = await getProducerToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  if (!isStorageConfigured()) {
    return Response.json({ error: 'storage não configurado (defina as envs S3_*)' }, { status: 503 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'campo "file" obrigatório' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: 'tipo não suportado (use jpg, png ou webp)' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'imagem maior que 8 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let key: string | undefined
  try {
    const up = await uploadEventCover(id, buffer, file.type)
    key = up.key
    const res = await fetch(`${API_BASE}/api/v1/events/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_url: up.url }),
    })
    if (!res.ok) {
      // Sem posse/evento, o PATCH falhou: apaga o objeto órfão e repassa o erro do Go.
      await deleteObject(up.key).catch(() => {})
      return new Response(await res.text(), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return Response.json({ cover_url: up.url })
  } catch (err) {
    if (key) await deleteObject(key).catch(() => {})
    return Response.json(
      { error: err instanceof Error ? err.message : 'Falha no upload' },
      { status: 500 },
    )
  }
}
