import { API_BASE, getAdminToken } from '@/lib/admin-session'

// Proxy autenticado do admin: encaminha qualquer chamada /api/admin/* para o Go em
// /api/v1/admin/* com o token da sessão (cookie httpOnly) como Bearer. O Go aplica
// auth/roles por rota. Navegador nunca vê o token, e a CSP mantém connect-src 'self'.
async function forward(req: Request, path: string[]) {
  const token = await getAdminToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const search = new URL(req.url).search
  const target = `${API_BASE}/api/v1/admin/${path.join('/')}${search}`
  const init: RequestInit = {
    method: req.method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await req.text()
  const res = await fetch(target, init)
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Ctx = { params: Promise<{ path: string[] }> }
const h = (req: Request, ctx: Ctx) => ctx.params.then(({ path }) => forward(req, path))

export const GET = h
export const POST = h
export const PATCH = h
export const PUT = h
export const DELETE = h
