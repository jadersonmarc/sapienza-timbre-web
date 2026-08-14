import { API_BASE } from '@/lib/session'

// Proxy do checkout público (compra como convidado — sem sessão). Encaminha o IP real para
// o rate-limit do Go funcionar por IP do comprador, não do container.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const fwd = req.headers.get('x-forwarded-for') || ''
  const res = await fetch(`${API_BASE}/api/v1/public/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': fwd },
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
