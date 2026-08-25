'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Receipt, Ticket } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { fetchMyOrders, type MyOrder } from '@/lib/client'
import { brl, formatDateTime } from '@/lib/format'

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Aguardando pagamento', tone: 'text-signal' },
  paid: { label: 'Pago', tone: 'text-primary' },
  refunded: { label: 'Estornado', tone: 'text-destructive' },
}

const METHOD: Record<string, string> = { pix: 'Pix', credit_card: 'Cartão' }

// Histórico de compras. Ingresso e pedido não são a mesma coisa: quando alguém contesta uma
// cobrança ou não reconhece um valor, é aqui que a resposta está — quanto, quando, como, e
// com a taxa separada do ingresso, como foi cobrada na época.
export default function PedidosPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<MyOrder[] | null>(null)

  useEffect(() => {
    fetchMyOrders().then(({ authed, orders }) => {
      if (!authed) return router.replace('/conta')
      setOrders(orders)
    })
  }, [router])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-10">
        <h1 className="font-display text-2xl font-bold">Meus pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suas compras, com o valor como foi cobrado.</p>

        {orders === null && <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>}

        {orders?.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
            <Receipt className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-3 font-display font-semibold">Nenhuma compra ainda</h2>
            <Link href="/eventos" className="mt-4 block">
              <Button className="w-full">Ver eventos</Button>
            </Link>
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {orders?.map((o) => {
            const st = STATUS[o.status] ?? { label: o.status, tone: 'text-muted-foreground' }
            return (
              <li key={o.order_id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/eventos/${o.event_id}`} className="font-medium hover:underline">
                    {o.event_title}
                  </Link>
                  <span className={`text-sm ${st.tone}`}>{st.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pedido de {formatDateTime(o.created_at)} · {o.ticket_count}{' '}
                  {o.ticket_count === 1 ? 'ingresso' : 'ingressos'}
                  {o.method && <> · {METHOD[o.method] ?? o.method}</>}
                  {o.installments > 1 && <> em {o.installments}×</>}
                </p>

                <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                  <Row label="Ingressos" value={brl(o.face_cents)} />
                  <Row label="Taxa de conveniência" value={brl(o.fee_cents)} />
                  <div className="flex justify-between pt-1">
                    <dt className="font-medium">Total</dt>
                    <dd className="font-display font-semibold">{brl(o.total_cents)}</dd>
                  </div>
                </dl>

                {o.status === 'paid' && (
                  <Link href="/ingressos" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Ticket className="size-4" /> Ver ingressos
                  </Link>
                )}
                {o.status === 'refunded' && o.refunded_at && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Estornado em {formatDateTime(o.refunded_at)}. Os ingressos deste pedido foram cancelados.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
