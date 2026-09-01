'use client'

// O NAVEGADOR fala apenas com rotas same-origin do próprio Next (app/api/*). Elas fazem
// proxy ao backend Go e gerenciam a sessão do comprador em COOKIE httpOnly (§4.1 — nada de
// token legível por JS). Assim a CSP do site pode manter connect-src 'self'.

export type CheckoutBody = {
  event_id: string
  lot_id?: string
  link_token?: string
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

// ── checkout (sessão: a conta é exigida no momento de pagar) ───────────────
export type SessionSelection = {
  event_id: string
  // lot_id é a ESCOLHA do tipo de ingresso. Vazio = o vigente, que é o caminho de quem
  // entra num evento com um tipo só.
  lot_id?: string
  // link_token abre a categoria oculta. Sem ele ela não existe para quem pede.
  link_token?: string
  quantity: number
  seat_ids?: string[]
  half_price_qty?: number
  coupon_code?: string
  campaign_id?: string
  anon_token?: string
}

export type CheckoutSession = {
  id: string
  event_id: string
  anon_token: string
  status: string
  expires_at?: string
  items?: { lot_id?: string; quantity?: number; seat_ids?: string[]; half_price_qty?: number; coupon_code?: string }
}

// anon_token do navegador: identifica as sessões de checkout pré-acesso deste dispositivo.
export function anonToken(): string {
  if (typeof window === 'undefined') return ''
  let t = window.localStorage.getItem('timbre_anon')
  if (!t) {
    t = crypto.randomUUID()
    try {
      window.localStorage.setItem('timbre_anon', t)
    } catch {}
  }
  return t
}

// clearAnonToken remove o token ao sair da conta — celular emprestado/compartilhado não
// deixa a seleção anterior acessível ao próximo. O próximo acesso gera um token novo.
export function clearAnonToken() {
  try {
    window.localStorage.removeItem('timbre_anon')
  } catch {}
}

export async function createSession(sel: SessionSelection): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch('/api/checkout/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...sel, anon_token: anonToken() }),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}

export async function authStarted(id: string): Promise<boolean> {
  const res = await fetch(`/api/checkout/sessions/${id}/auth-started`, {
    method: 'POST',
    headers: { 'X-Anon-Token': anonToken() },
  })
  return res.ok
}

export async function bindSession(id: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`/api/checkout/sessions/${id}/bind`, { method: 'POST' })
  return { ok: res.ok, status: res.status }
}

// Attendee é a ficha nominal de um ingresso: quem vai usar aquela entrada.
export type Attendee = { name: string; cpf: string; email?: string; half_price?: boolean }

// Dados do cadastro do comprador. Nome, documento e telefone não são burocracia da tela:
// é o que o gateway exige para criar a cobrança no nome de alguém.
export type RegisterBody = {
  name: string
  email: string
  cpf: string
  phone: string
  birth_date: string
  password: string
}

// updateMe completa/corrige os dados da conta. Usado quando uma conta antiga (criada só
// com e-mail) precisa de documento e telefone para poder pagar.
export async function updateMe(body: Omit<RegisterBody, 'email' | 'password'>): Promise<{ ok: boolean; error: string }> {
  const res = await fetch('/api/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await j(res)
  return { ok: res.ok, error: data?.error ?? '' }
}

// deleteAccount apaga a conta e derruba a sessão (LGPD).
export async function deleteAccount(): Promise<boolean> {
  const res = await fetch('/api/me', { method: 'DELETE' })
  return res.ok
}

export async function register(body: RegisterBody): Promise<{ ok: boolean; error: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await j(res)
  return { ok: res.ok, error: data?.error ?? '' }
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await j(res)
  return { ok: res.ok, error: data?.error ?? '' }
}

// updateSession troca a seleção/ficha da reserva já criada, sem recomeçar o checkout.
// resetPassword define uma senha nova com o código recebido por e-mail e já devolve a
// pessoa autenticada — quem chegou aqui não tem como entrar de outro jeito.
export async function resetPassword(email: string, code: string, password: string): Promise<{ ok: boolean; error: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, password }),
  })
  const data = await j(res)
  return { ok: res.ok, error: data?.error ?? '' }
}

export async function updateSession(
  id: string,
  sel: SessionSelection & { attendees?: Attendee[] },
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`/api/checkout/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Anon-Token': anonToken() },
    body: JSON.stringify(sel),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}

export async function paySession(
  id: string,
  body: {
    method: string
    buyer_cpf?: string
    attendees?: Attendee[]
    card?: Record<string, string>
    installments?: number
  },
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`/api/checkout/sessions/${id}/pay`, {
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

// Sessão do comprador (compra exige cadastro — a conta é exigida no pagamento). 401 = não
// autenticado. Inclui dados da conta (nome/cpf vêm do subject, não do formulário).
export async function fetchBuyerSession(): Promise<{
  authed: boolean
  email?: string
  name?: string
  cpf?: string
  phone?: string
  birth_date?: string
}> {
  const res = await fetch('/api/me')
  if (!res.ok) return { authed: false }
  const body = await j(res)
  return {
    authed: true,
    email: body.email || undefined,
    name: body.name || undefined,
    cpf: body.cpf || undefined,
    phone: body.phone || undefined,
    birth_date: body.birth_date || undefined,
  }
}

// ── meus ingressos ─────────────────────────────────────────────────────────────
export type MyOrder = {
  order_id: string
  event_id: string
  event_title: string
  event_starts_at?: string
  ticket_count: number
  face_cents: number
  fee_cents: number
  total_cents: number
  method: string
  installments: number
  status: string
  created_at: string
  paid_at?: string
  refunded_at?: string
}

export async function fetchMyOrders(): Promise<{ authed: boolean; orders: MyOrder[] }> {
  const res = await fetch('/api/me/orders')
  if (!res.ok) return { authed: false, orders: [] }
  const body = await j(res)
  return { authed: true, orders: body.orders ?? [] }
}

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

// ── devolução (estorno) ────────────────────────────────────────────────────────
export type RefundPolicy = {
  withdrawal_window_days: number
  withdrawal_min_hours_before_event: number
  accepts_requests_after_window: boolean
  checkin_blocks_refund: boolean
}

export type RefundRequest = {
  id: string
  order_id: string
  ticket_ids: string[]
  track: string
  status: string
  reason?: string
  decision_reason?: string
  responds_by?: string
  refund_amount_cents: number
  created_at: string
}

export async function fetchRefundPolicy(eventId: string): Promise<RefundPolicy | null> {
  const res = await fetch(`/api/events/${eventId}/refund-policy`)
  if (!res.ok) return null
  return j(res)
}

export async function fetchMyRefundRequests(): Promise<RefundRequest[]> {
  const res = await fetch('/api/me/refund-requests')
  if (!res.ok) return []
  const body = await j(res)
  return body.requests ?? []
}

// requestRefund devolve `immediate` quando o estorno já aconteceu (arrependimento dentro da
// janela é direito, não passa pela casa) e `pending` quando entrou na fila do produtor.
export async function requestRefund(
  orderId: string,
  reason: string,
  ticketIds?: string[],
): Promise<{ ok: boolean; immediate: boolean; error: string; request?: RefundRequest }> {
  const res = await fetch(`/api/me/orders/${orderId}/refund-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, ticket_ids: ticketIds }),
  })
  const body = await j(res)
  if (!res.ok) return { ok: false, immediate: false, error: body?.error ?? 'não foi possível pedir a devolução' }
  return { ok: true, immediate: res.status === 200, error: '', request: body.request }
}
