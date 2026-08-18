'use client'

// O NAVEGADOR fala apenas com rotas same-origin do próprio Next (app/api/*). Elas fazem
// proxy ao backend Go e gerenciam a sessão do comprador em COOKIE httpOnly (§4.1 — nada de
// token legível por JS). Assim a CSP do site pode manter connect-src 'self'.

export type CheckoutBody = {
  event_id: string
  quantity: number
  seat_ids?: string[]
  half_price_qty?: number
  coupon_code?: string
  method: string
  installments?: number
  buyer_name?: string
  buyer_email?: string
  buyer_cpf?: string
}

async function j(res: Response) {
  return res.json().catch(() => ({}))
}

// ── checkout ────────────────────────────────────────────────────────────────
export async function startCheckout(body: CheckoutBody) {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}

export type Breakdown = {
  face_cents: number
  platform_fee_cents: number
  processing_cents: number
  convenience_fee_cents: number
  total_cents: number
}

export async function quote(body: CheckoutBody): Promise<{ ok: boolean; breakdown: Breakdown | null }> {
  const res = await fetch('/api/checkout/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return { ok: false, breakdown: null }
  return { ok: true, breakdown: await j(res) }
}

export async function checkoutStatus(orderId: string): Promise<{ status: string }> {
  const res = await fetch(`/api/checkout/${orderId}/status`)
  return res.ok ? j(res) : { status: 'unknown' }
}

// Ocupação viva de assentos (volátil — buscada no cliente).
export async function fetchOccupancy(eventId: string): Promise<Set<string>> {
  const res = await fetch(`/api/events/${eventId}/occupancy`)
  if (!res.ok) return new Set()
  const body = await j(res)
  return new Set<string>(body.occupied ?? [])
}

// ── OTP / sessão ──────────────────────────────────────────────────────────────
export async function requestCode(email: string) {
  const res = await fetch('/api/auth/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return res.ok
}

export async function verifyCode(email: string, code: string) {
  const res = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  return { ok: res.ok, status: res.status }
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
}

// ── meus ingressos ─────────────────────────────────────────────────────────────
export async function fetchMyTickets() {
  const res = await fetch('/api/me/tickets')
  if (res.status === 401) return { authed: false, tickets: [] }
  if (!res.ok) return { authed: true, tickets: [] }
  const body = await j(res)
  return { authed: true, tickets: body.tickets ?? [] }
}

// ── posse do ingresso (Onda 2) ──────────────────────────────────────────────────
export async function transferTicket(ticketId: string, toEmail: string) {
  const res = await fetch(`/api/me/tickets/${ticketId}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_email: toEmail }),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}

export async function sellTicket(ticketId: string, priceCents: number) {
  const res = await fetch(`/api/me/tickets/${ticketId}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price_cents: priceCents }),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}

export async function reissueTicket(ticketId: string) {
  const res = await fetch(`/api/me/tickets/${ticketId}/reissue`, { method: 'POST' })
  return { ok: res.ok, status: res.status }
}

// ── lista de espera ────────────────────────────────────────────────────────────
export async function joinWaitlist(eventId: string, email: string) {
  const res = await fetch(`/api/events/${eventId}/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return res.ok
}

// ── landing B2B ────────────────────────────────────────────────────────────────
export async function producerSignup(name: string, email: string, password: string) {
  const res = await fetch('/api/producer-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, owner_email: email, owner_password: password }),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}
