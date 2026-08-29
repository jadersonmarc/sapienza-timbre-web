import { API_BASE, getProducerToken } from '@/lib/producer-session'

/**
 * Baixa a exportação de ingressos em CSV.
 *
 * Rota própria porque o proxy geral (`/api/producer/[...path]`) devolve tudo como JSON e
 * lê a resposta inteira em memória. Aqui o corpo é REPASSADO como veio: o Go transmite
 * linha a linha e o navegador começa a salvar antes de o evento inteiro ter sido lido.
 *
 * O link do navegador não carrega cabeçalho `Authorization` — é esta rota que troca o
 * cookie httpOnly da sessão pelo Bearer, do lado do servidor.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = await getProducerToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const { id } = await ctx.params

  const qs = new URL(req.url).searchParams
  // Só o que a exportação entende passa adiante.
  const allow = new URLSearchParams()
  for (const k of ['from', 'to', 'status']) {
    const v = qs.get(k)
    if (v) allow.set(k, v)
  }
  const suffix = allow.toString() ? `?${allow}` : ''

  const res = await fetch(`${API_BASE}/api/v1/dash/events/${id}/export.csv${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    return Response.json({ error: 'não foi possível exportar' }, { status: res.status })
  }
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ingressos-${id}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
