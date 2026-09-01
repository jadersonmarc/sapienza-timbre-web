import { API_BASE } from '@/lib/session'

// Proxy da categoria com link exclusivo. Sem cache: o link pode ter sido revogado agora, e
// uma resposta guardada continuaria abrindo o que já foi fechado.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const k = new URL(req.url).searchParams.get('k') ?? ''
  const res = await fetch(
    `${API_BASE}/api/v1/public/events/${id}/hidden-lot?k=${encodeURIComponent(k)}`,
    { cache: 'no-store' },
  )
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
