'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { ProducerNav } from '@/components/producer-nav'
import { PayoutPanel, type Payout } from '@/components/payout-panel'
import { pget } from '@/lib/producer'
import { brl, formatDate } from '@/lib/format'

type Credit = {
  event_id: string
  event_title: string
  order_id: string
  amount_cents: number
  created_at: string
}

/**
 * Extrato de repasses do produtor.
 *
 * O modelo é de retenção: o valor das vendas fica com a bilheteria e é transferido depois que
 * o evento acontece. Sem uma tela que diga quanto, quando e por quê, isso é indistinguível de
 * "a plataforma está com o meu dinheiro e não me explica nada".
 */
export default function RepassesPage() {
  const [d, setD] = useState<{
    payouts: Payout[]
    pending_cents: number
    upcoming_cents: number
    paid_cents: number
    destination_missing: boolean
    recoverable_credits: Credit[]
  } | null>(null)

  useEffect(() => {
    pget('dash/payouts').then((r) => r.ok && setD(r.data))
  }, [])

  if (!d) {
    return (
      <>
        <ProducerNav />
        <main className="mx-auto max-w-3xl px-4 pt-8 text-muted-foreground">Carregando…</main>
      </>
    )
  }

  return (
    <>
      <ProducerNav />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Repasses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O valor das vendas fica com a bilheteria e é transferido para você depois que o evento
          acontece. Um repasse por evento.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Card label="A receber" value={d.pending_cents} hint="eventos que já aconteceram" />
          <Card label="Acumulando" value={d.upcoming_cents} hint="eventos que ainda vão acontecer" />
          <Card label="Já recebido" value={d.paid_cents} hint="transferências registradas" />
        </div>

        {d.destination_missing && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-signal/40 bg-signal/5 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-signal" />
            <span>
              Falta a sua chave Pix de recebimento — sem ela não conseguimos transferir.{' '}
              <Link href="/painel" className="underline">
                Cadastrar agora
              </Link>
              .
            </span>
          </p>
        )}

        {d.recoverable_credits?.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold">Valores a acertar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Devoluções que aconteceram <strong>depois</strong> de o repasse do evento ter sido pago.
              Nada é descontado sozinho de repasses futuros — a plataforma fala com você.
            </p>
            <ul className="mt-3 space-y-2">
              {d.recoverable_credits.map((c) => (
                <li
                  key={c.order_id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                >
                  <span>
                    {c.event_title}
                    <span className="block text-xs text-muted-foreground">
                      devolução de {formatDate(c.created_at)}
                    </span>
                  </span>
                  <span className="font-medium">{brl(c.amount_cents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 space-y-6">
          {d.payouts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum repasse ainda. Ele aparece aqui na primeira venda.
            </p>
          )}
          {d.payouts.map((p) => (
            <div key={p.event_id}>
              <h2 className="mb-2 font-display text-lg font-semibold">
                <Link href={`/painel/eventos/${p.event_id}`} className="hover:underline">
                  {p.event_title}
                </Link>
              </h2>
              <PayoutPanel p={p} />
            </div>
          ))}
        </section>
      </main>
    </>
  )
}

function Card({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{brl(value)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
