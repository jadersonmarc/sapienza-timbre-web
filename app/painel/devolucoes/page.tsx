'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ShieldAlert } from 'lucide-react'
import { ProducerNav } from '@/components/producer-nav'
import { Button } from '@/components/ui/button'
import { pget, ppost } from '@/lib/producer'
import { brl, formatDateTime } from '@/lib/format'

type Req = {
  id: string
  order_id: string
  ticket_ids: string[]
  track: string
  status: string
  reason?: string
  responds_by?: string
  refund_amount_cents: number
  created_at: string
  overdue: boolean
}

type Sale = {
  order_id: string
  event_title: string
  buyer_name: string
  buyer_email: string
  buyer_cpf: string
  status: string
  total_cents: number
  tickets: number
  active_tickets: number
  created_at: string
  refund_request_status?: string
}

type Ticket = {
  id: string
  status: string
  attendee_name: string
  sector: string
  seat: string
  checked_in: boolean
}

const TRACK: Record<string, string> = {
  withdrawal: 'Arrependimento (direito)',
  discretionary: 'Fora do prazo — sua decisão',
  producer_initiated: 'Cancelado por você',
  admin_override: 'Decisão da plataforma',
}

/**
 * Devoluções: a fila de pedidos e a busca de vendas.
 *
 * A fila vem primeiro porque é o que tem prazo correndo. A busca existe porque quem liga
 * não sabe o id do pedido — sabe o próprio e-mail —, e sem ela o produtor não tinha como
 * chegar a uma venda específica para cancelar.
 */
export default function DevolucoesPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<Req[] | null>(null)
  const [debt, setDebt] = useState<number>(0)

  const load = useCallback(async () => {
    const [q, p] = await Promise.all([pget('refund-requests'), pget('dash/payouts')])
    if (q.status === 401) return router.replace('/painel/entrar')
    setRequests(q.data.requests ?? [])
    setDebt(p.data?.debt_cents ?? 0)
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const pending = requests?.filter((r) => r.status === 'pending') ?? []
  const decided = requests?.filter((r) => r.status !== 'pending') ?? []

  return (
    <>
      <ProducerNav />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Devoluções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos que dependem de você, e a busca das vendas.
        </p>

        {debt > 0 && (
          <div className="mt-5 flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <ShieldAlert className="size-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium">Saldo devedor de {brl(debt)}</p>
              <p className="mt-1 text-muted-foreground">
                Devoluções que a plataforma pagou ao comprador quando sua conta de recebimento
                não tinha saldo. O valor é descontado dos próximos repasses.
              </p>
            </div>
          </div>
        )}

        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold">
            Aguardando sua resposta {pending.length > 0 && <span className="text-signal">({pending.length})</span>}
          </h2>
          {requests === null && <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>}
          {requests !== null && pending.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Nada pendente.</p>
          )}
          <ul className="mt-3 space-y-3">
            {pending.map((r) => (
              <PendingCard key={r.id} req={r} onDone={load} />
            ))}
          </ul>
        </section>

        {decided.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">Já decididos</h2>
            <ul className="mt-3 space-y-2">
              {decided.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>{TRACK[r.track] ?? r.track}</span>
                    <span className="text-muted-foreground">{r.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
                    {r.refund_amount_cents > 0 && <> · {brl(r.refund_amount_cents)} devolvidos</>}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SalesSearch onChanged={load} />
      </main>
    </>
  )
}

/** PendingCard é a decisão em si. Recusar exige motivo — a caixa não deixa passar vazia. */
function PendingCard({ req, onDone }: { req: Req; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function decide(approve: boolean) {
    if (!approve && !reason.trim()) {
      setError('Diga o motivo da recusa — é o que o comprador vai ler.')
      return
    }
    setBusy(true)
    setError('')
    const res = await ppost(`refund-requests/${req.id}/${approve ? 'approve' : 'reject'}`, {
      reason: reason.trim(),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.data?.error ?? 'não foi possível registrar a decisão')
      return
    }
    onDone()
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{TRACK[req.track] ?? req.track}</span>
        {req.overdue && <span className="text-sm text-destructive">Prazo vencido</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Pedido em {formatDateTime(req.created_at)}
        {req.responds_by && <> · responder até {formatDateTime(req.responds_by)}</>}
      </p>
      {req.reason && (
        <p className="mt-2 rounded-lg bg-background p-2 text-sm">
          <span className="text-muted-foreground">Comprador:</span> {req.reason}
        </p>
      )}

      <label className="mt-3 block text-xs text-muted-foreground" htmlFor={`d-${req.id}`}>
        Motivo (obrigatório para recusar)
      </label>
      <textarea
        id={`d-${req.id}`}
        rows={2}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
          Aprovar e devolver
        </Button>
        <Button variant="outline" onClick={() => decide(false)} disabled={busy}>
          Recusar
        </Button>
      </div>
    </li>
  )
}

/** SalesSearch acha a venda por pessoa, pedido ou ingresso, e permite cancelar. */
function SalesSearch({ onChanged }: { onChanged: () => void }) {
  const [q, setQ] = useState('')
  const [sales, setSales] = useState<Sale[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    const res = await pget(`sales?q=${encodeURIComponent(q)}`)
    setSales(res.data.sales ?? [])
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-lg font-semibold">Buscar venda</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Por e-mail, CPF, nome, número do pedido ou do ingresso.
      </p>
      <form onSubmit={search} className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="cliente@email.com"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <Button type="submit">
          <Search className="size-4" />
        </Button>
      </form>

      {sales !== null && sales.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma venda encontrada.</p>
      )}
      <ul className="mt-4 space-y-2">
        {sales?.map((s) => (
          <li key={s.order_id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{s.buyer_name || s.buyer_email}</span>
              <span className="text-sm text-muted-foreground">{brl(s.total_cents)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.event_title} · {s.active_tickets} de {s.tickets}{' '}
              {s.tickets === 1 ? 'ingresso válido' : 'ingressos válidos'} ·{' '}
              {formatDateTime(s.created_at)}
            </p>
            {s.refund_request_status && (
              <p className="mt-1 text-xs text-signal">
                Já existe um pedido de devolução ({s.refund_request_status}).
              </p>
            )}
            {s.active_tickets > 0 && !s.refund_request_status && (
              <button
                onClick={() => setOpen(open === s.order_id ? null : s.order_id)}
                className="mt-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                {open === s.order_id ? 'Fechar' : 'Cancelar ingressos desta venda'}
              </button>
            )}
            {open === s.order_id && (
              <CancelBox
                orderId={s.order_id}
                onDone={() => {
                  setOpen(null)
                  setSales(null)
                  onChanged()
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * CancelBox é o cancelamento pelo produtor, total ou parcial. O parcial existe porque
 * devolver quatro ingressos quando a pessoa pediu um é um erro caro de desfazer — e a lista
 * mostra quem já entrou, que é o caso em que a devolução não é sua para dar.
 */
function CancelBox({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    pget(`sales/${orderId}/tickets`).then((r) => setTickets(r.data.tickets ?? []))
  }, [orderId])

  const active = tickets?.filter((t) => t.status === 'active') ?? []

  function toggle(id: string) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  async function submit() {
    setBusy(true)
    setError('')
    const body: Record<string, unknown> = { reason: reason.trim() }
    // Nenhum marcado = a venda inteira. Marcar todos daria no mesmo, e obrigar a marcar
    // seria trabalho à toa no caso mais comum.
    if (picked.size > 0) body.ticket_ids = [...picked]
    const res = await ppost(`orders/${orderId}/refund`, body)
    setBusy(false)
    if (!res.ok) {
      setError(res.data?.error ?? 'não foi possível cancelar')
      return
    }
    onDone()
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3">
      {tickets === null && <p className="text-sm text-muted-foreground">Carregando ingressos…</p>}
      {tickets !== null && (
        <>
          <p className="text-xs text-muted-foreground">
            Marque os ingressos a cancelar. Sem nenhum marcado, a venda inteira é devolvida.
          </p>
          <ul className="mt-2 space-y-1">
            {active.map((t) => (
              <li key={t.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={picked.has(t.id)}
                    onChange={() => toggle(t.id)}
                    disabled={t.checked_in}
                  />
                  <span className={t.checked_in ? 'text-muted-foreground line-through' : ''}>
                    {t.attendee_name || 'sem nome'}
                    {t.seat && ` · ${t.sector} ${t.seat}`}
                  </span>
                  {t.checked_in && <span className="text-xs text-muted-foreground">já entrou</span>}
                </label>
              </li>
            ))}
          </ul>
          {active.some((t) => t.checked_in) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Ingresso que já passou na portaria não pode ser cancelado por aqui. Se for
              mesmo o caso, fale com a plataforma.
            </p>
          )}

          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="Motivo (fica no registro)"
            className="mt-3 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={busy} className="mt-3 w-full">
            {busy ? 'Cancelando…' : 'Confirmar cancelamento'}
          </Button>
        </>
      )}
    </div>
  )
}
