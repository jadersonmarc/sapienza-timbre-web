'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, ShieldAlert } from 'lucide-react'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apost } from '@/lib/admin'
import { brl, formatDateTime } from '@/lib/format'

type Sale = {
  order_id: string
  producer_id: string
  producer_name: string
  event_title: string
  buyer_name: string
  buyer_email: string
  status: string
  total_cents: number
  tickets: number
  active_tickets: number
  created_at: string
  refund_request_id?: string
  refund_request_status?: string
}

type FailedJob = {
  job_id: string
  producer_id: string
  producer_name: string
  event_title: string
  order_id: string
  buyer_email: string
  total_cents: number
  attempts: number
  last_error: string
}

type Debtor = {
  producer_id: string
  producer_name: string
  debt_cents: number
  debt_alert: boolean
}

/**
 * Devoluções da plataforma.
 *
 * A busca varre todas as casas porque quem escreve para a plataforma não sabe de qual
 * produtor comprou — é o caso normal de quem procura a plataforma em vez do produtor. E o
 * override existe para o que o produtor não pode fazer: devolver ingresso que já entrou, ou
 * decidir um pedido que a casa deixou parado.
 */
export default function AdminDevolucoesPage() {
  const [q, setQ] = useState('')
  const [sales, setSales] = useState<Sale[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [failed, setFailed] = useState<FailedJob[]>([])

  const loadQueues = useCallback(() => {
    aget('payouts').then((r) => {
      const list: Debtor[] = (r.data?.producers ?? []).filter((p: Debtor) => (p.debt_cents ?? 0) > 0)
      setDebtors(list)
    })
    aget('refund-jobs/failed').then((r) => setFailed(r.data?.failed ?? []))
  }, [])

  useEffect(() => {
    loadQueues()
  }, [loadQueues])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    const res = await aget(`sales?q=${encodeURIComponent(q.trim())}`)
    setBusy(false)
    setSales(res.data.sales ?? [])
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Devoluções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busca em todas as casas, e o que só a plataforma pode decidir.
        </p>

        {debtors.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-lg font-semibold">Produtores devendo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Devoluções que a plataforma pagou ao comprador porque a conta do produtor não
              tinha saldo. Sai dos próximos repasses; acima do limiar, vira cobrança.
            </p>
            <ul className="mt-3 space-y-2">
              {debtors.map((d) => (
                <li
                  key={d.producer_id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <span className="flex items-center gap-2 text-sm">
                    {d.debt_alert && <ShieldAlert className="size-4 text-destructive" />}
                    {d.producer_name}
                  </span>
                  <span className={d.debt_alert ? 'font-medium text-destructive' : 'text-sm'}>
                    {brl(d.debt_cents)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {failed.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">
              Devoluções travadas <span className="text-destructive">({failed.length})</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cancelamentos de evento cuja devolução esgotou as tentativas. Dinheiro que não
              voltou: cada linha é uma pessoa esperando.
            </p>
            <ul className="mt-3 space-y-2">
              {failed.map((f) => (
                <FailedCard key={f.job_id} job={f} onDone={loadQueues} />
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Buscar uma compra</h2>
          <form onSubmit={search} className="mt-3 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e-mail, CPF, nome, número do pedido ou do ingresso"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={busy}>
              <Search className="size-4" />
            </Button>
          </form>

          {sales !== null && sales.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Nada encontrado.</p>
          )}
          <ul className="mt-4 space-y-2">
            {sales?.map((s) => (
              <AdminSaleCard key={`${s.producer_id}:${s.order_id}`} sale={s} onDone={() => setSales(null)} />
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}

function AdminSaleCard({ sale, onDone }: { sale: Sale; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function override(kind: 'refund' | 'approve' | 'reject') {
    if (!reason.trim()) {
      setError('Motivo é obrigatório — é o que explica, meses depois, por que este pedido saiu da regra.')
      return
    }
    setBusy(true)
    setError('')
    const path =
      kind === 'refund'
        ? `producers/${sale.producer_id}/orders/${sale.order_id}/refund`
        : `producers/${sale.producer_id}/refund-requests/${sale.refund_request_id}/${kind}`
    const res = await apost(path, { reason: reason.trim() })
    setBusy(false)
    if (!res.ok) {
      setError(res.data?.error ?? 'não foi possível concluir')
      return
    }
    onDone()
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{sale.buyer_name || sale.buyer_email}</span>
        <span className="text-sm text-muted-foreground">{brl(sale.total_cents)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {sale.producer_name} · {sale.event_title} · {sale.active_tickets} de {sale.tickets} válidos ·{' '}
        {formatDateTime(sale.created_at)} · {sale.status}
      </p>
      {sale.refund_request_status && (
        <p className="mt-1 text-xs text-signal">
          Pedido de devolução {sale.refund_request_status}.
        </p>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Agir por cima do produtor
        </button>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            placeholder="Motivo (obrigatório, fica no registro)"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {sale.active_tickets > 0 && (
              <Button onClick={() => override('refund')} disabled={busy}>
                Devolver a venda inteira
              </Button>
            )}
            {sale.refund_request_status === 'pending' && (
              <>
                <Button variant="outline" onClick={() => override('approve')} disabled={busy}>
                  Aprovar o pedido
                </Button>
                <Button variant="outline" onClick={() => override('reject')} disabled={busy}>
                  Recusar o pedido
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Voltar
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O override passa por cima das guardas do produtor, inclusive de ingresso que já
            entrou. Tudo fica na trilha de auditoria.
          </p>
        </div>
      )}
    </li>
  )
}

/**
 * FailedCard é uma devolução que travou. O motivo fica à vista porque é ele que diz o que
 * resolver antes de tentar de novo — saldo na conta do produtor, cadastro do comprador,
 * gateway fora do ar.
 */
function FailedCard({ job, onDone }: { job: FailedJob; onDone: () => void }) {
  const [busy, setBusy] = useState(false)

  async function retry() {
    setBusy(true)
    await apost(`producers/${job.producer_id}/refund-jobs/${job.job_id}/retry`)
    setBusy(false)
    onDone()
  }

  return (
    <li className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{job.buyer_email || 'comprador sem e-mail'}</span>
        <span className="text-sm">{brl(job.total_cents)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {job.producer_name} · {job.event_title} · {job.attempts}{' '}
        {job.attempts === 1 ? 'tentativa' : 'tentativas'}
      </p>
      <p className="mt-2 break-words rounded-lg bg-background p-2 font-mono text-xs">
        {job.last_error}
      </p>
      <Button variant="outline" onClick={retry} disabled={busy} className="mt-3">
        {busy ? 'Reenfileirando…' : 'Tentar de novo'}
      </Button>
    </li>
  )
}
