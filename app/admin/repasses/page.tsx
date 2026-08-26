'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Copy, Check, ShieldAlert } from 'lucide-react'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apost } from '@/lib/admin'
import { brl, formatDate } from '@/lib/format'

type Split = {
  producer_id: string
  producer_name: string
  order_id: string
  event_title: string
  face_cents: number
  payment_method: string
  installments: number
  split_status: string
  refusal_reason?: string
  asaas_payment_id?: string
  updated_at: string
}

const SPLIT_ESTADO: Record<string, string> = {
  BLOCKED: 'Bloqueado por divergência — há prazo para ajustar',
  CANCELLED: 'Cancelado pelo gateway — resolução manual',
  REFUSED: 'Recusado pelo gateway',
}

type Due = {
  producer_id: string
  producer_name: string
  net_due_cents: number
  upcoming_cents: number
  pending_cents: number
  pix_key: string
  pix_key_type: string
  holder_name: string
  holder_tax_id: string
  oldest_due?: string
  blocked: boolean
}

// Fila de repasse: o dinheiro das vendas entra centralizado, então esta é a lista de
// trabalho de quem paga. Mostra separadamente o que já pode ser transferido e o que ainda
// está preso pelo prazo — e destaca quem tem dinheiro a receber sem chave cadastrada, que
// é o caso que precisa de cobrança e não de transferência.
export default function RepassesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Due[] | null>(null)
  const [total, setTotal] = useState(0)
  const [copied, setCopied] = useState('')
  const [splits, setSplits] = useState<Split[]>([])

  const load = useCallback(() => {
    aget('splits').then((r) => r.ok && setSplits(r.data.splits ?? []))
    aget('payouts').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setRows(r.data.producers ?? [])
      setTotal(r.data.total_pending_cents ?? 0)
    })
  }, [router])
  useEffect(load, [load])

  async function markPaid(row: Due) {
    const reference = window.prompt(
      `Referência da transferência para ${row.producer_name} (ex.: E2E do Pix). É o comprovante do repasse.`,
    )
    if (!reference) return
    const r = await apost(`producers/${row.producer_id}/payouts/mark-paid`, { reference })
    if (!r.ok) window.alert(r.data?.error ?? 'Não foi possível registrar.')
    load()
  }

  function copy(value: string) {
    navigator.clipboard?.writeText(value)
    setCopied(value)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Repasses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O valor vem do razão: face das vendas, menos retenção, mais estornos, menos o que já foi
          transferido.
        </p>
        {total > 0 && (
          <p className="mt-3 text-sm">
            Aguardando transferência: <span className="font-medium">{brl(total)}</span>
          </p>
        )}

        {/* Repasses que o gateway não conseguiu concluir. A cobrança é criada semanas antes
            de ser paga: se a tabela de tarifas mudar nesse intervalo, um split que passou na
            criação pode divergir na liquidação. É esperado — mas tem prazo. */}
        {splits.length > 0 && (
          <section className="mt-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShieldAlert className="size-5 text-destructive" /> Repasses travados no gateway
            </h2>
            <ul className="mt-3 space-y-2">
              {splits.map((s) => (
                <li key={s.order_id} className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {s.producer_name} · {s.event_title}
                    </span>
                    <span>{brl(s.face_cents)}</span>
                  </div>
                  <p className="mt-1 text-xs">{SPLIT_ESTADO[s.split_status] ?? s.split_status}</p>
                  {s.refusal_reason && (
                    <p className="mt-1 break-words text-xs text-muted-foreground">{s.refusal_reason}</p>
                  )}
                  {s.asaas_payment_id && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{s.asaas_payment_id}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {rows === null && <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>}
        {rows?.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">Nenhum repasse pendente no momento.</p>
        )}

        <ul className="mt-6 space-y-3">
          {rows?.map((row) => (
            <li key={row.producer_id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{row.producer_name}</p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Liberado:</span>{' '}
                  <span className="font-display text-lg font-semibold">{brl(row.net_due_cents)}</span>
                </p>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                A liberar: {brl(row.upcoming_cents)}
                {row.oldest_due && <> · mais antigo desde {formatDate(row.oldest_due)}</>}
              </p>

              {row.blocked ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Sem chave Pix cadastrada. O produtor precisa informar no painel dele antes de
                  conseguirmos transferir.
                </p>
              ) : (
                <div className="mt-3 rounded-lg border border-border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {row.holder_name} · {row.holder_tax_id}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="uppercase text-xs text-muted-foreground">{row.pix_key_type}</span>
                    <span className="font-mono">{row.pix_key}</span>
                    <button
                      onClick={() => copy(row.pix_key)}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                    >
                      {copied === row.pix_key ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copied === row.pix_key ? 'copiado' : 'copiar'}
                    </button>
                  </div>
                </div>
              )}

              {row.pending_cents > 0 && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => markPaid(row)}>
                  Registrar transferência
                </Button>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
