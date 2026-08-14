import { API_BASE } from '@/lib/session'

// Proxy do request-code (resposta sempre neutra; o Go não revela cadastro).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
