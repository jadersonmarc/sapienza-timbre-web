import { cookies } from 'next/headers'
import { API_BASE, getSessionToken, SESSION_COOKIE } from '@/lib/session'

// Sessão do comprador: lê o cookie httpOnly e encaminha ao Go (GET /public/me). O checkout
// usa para decidir entre "entre para comprar" e o formulário de compra.
export async function GET() {
  const token = await getSessionToken()
  if (!token) return Response.json({ authed: false }, { status: 401 })
  const res = await fetch(`${API_BASE}/api/v1/public/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Completa os dados da conta (nome, documento, telefone, nascimento). Contas antigas
// nasceram só com e-mail, pelo código de acesso, e sem documento não há como cobrar — é
// por aqui que elas se completam sem recomeçar a compra.
export async function PATCH(req: Request) {
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'sessão expirada' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Apagar a conta (LGPD). O cookie de sessão morre junto: deixar a sessão viva depois de
// apagar a conta produziria uma tela logada sem dono.
export async function DELETE() {
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'sessão expirada' }, { status: 401 })
  const res = await fetch(`${API_BASE}/api/v1/public/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) {
    const c = await cookies()
    c.delete(SESSION_COOKIE)
  }
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
