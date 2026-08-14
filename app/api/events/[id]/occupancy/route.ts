import { API_BASE } from '@/lib/session'

// Proxy da ocupação viva de assentos (volátil — sem cache).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const res = await fetch(`${API_BASE}/api/v1/public/events/${id}/occupancy`, { cache: 'no-store' })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
