import { API_BASE, getSessionToken } from '@/lib/session'

// Proxy do checkout (compra exige cadastro): encaminha a sessão do comprador como Bearer e
// o IP real para o rate-limit do Go funcionar por IP do comprador, não do container.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const token = await getSessionToken()
  const fwd = req.headers.get('x-forwarded-for') || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': fwd,
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/api/v1/public/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

