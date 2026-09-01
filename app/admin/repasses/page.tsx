'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Copy, Check, Clock, PauseCircle, PlayCircle } from 'lucide-react'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apost } from '@/lib/admin'
import { brl, formatDate } from '@/lib/format'

type Payout = {
  producer_id: string
  producer_name: string
  event_id: string
  event_title: string
  net_due_cents: number
  gross_face_cents: number
  refunded_face_cents: number
  status: string
  due_at?: string
  overdue: boolean
  hold_reason?: string
  hold_message?: string
  pix_key: string
  pix_key_type: string
  holder_name: string
  holder_tax_id: string
  blocked: boolean
}

type Credit = {
  producer_id: string
  producer_name: string
  event_id: string
  event_title: string
  order_id: string
  amount_cents: number
  created_at: string
}

type Reason = { key: string; message: string }

const ESTADO: Record<string, string> = {
  accruing: 'acumulando — o evento ainda não aconteceu',
  pending: 'a transferir',
  on_hold: 'retido',
}

/**
 * Fila de repasse, evento a evento.
 *
 * O dinheiro fica com a bilheteria até depois da realização, então a pergunta que importa
 * não é "quanto este produtor tem a receber" e sim "quais eventos já venceram". Juntar tudo
 * num saldo por produtor esconderia exatamente isso.
 *
 * Nada aqui transfere dinheiro: a execução bancária não existe no produto. O botão registra
 * uma transferência já feita, com o comprovante — sem ele, "pago" vira palavra contra
 * palavra na primeira divergência.
 */
export default function RepassesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Payout[] | null>(null)
  const [credits, setCredits] = useState<Credit[]>([])
  const [reasons, setReasons] = useState<Reason[]>([])
  const [total, setTotal] = useState(0)
  const [copied, setCopied] = useState('')

  const load = useCallback(() => {
    aget('payouts/hold-reasons').then((r) => r.ok && setReasons(r.data.reasons ?? []))
    aget('payouts').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setRows(r.data.payouts ?? [])
      setCredits(r.data.recoverable_credits ?? [])
      setTotal(r.data.total_pending_cents ?? 0)
    })
  }, [router])
  useEffect(load, [load])

  async function markPaid(row: Payout) {
    const reference = window.prompt(
      `Faça o Pix e cole aqui a referência (E2E) da transferência de ${brl(row.net_due_cents)} para ${row.producer_name}.\n\nEste botão só REGISTRA — ele não transfere nada.`,
    )
    if (!reference) return
    const r = await apost(`producers/${row.producer_id}/payouts/mark-paid`, {
      event_id: row.event_id,
      reference,
    })
    if (!r.ok) window.alert(r.data?.error ?? 'Não foi possível registrar.')
    load()
  }

  async function hold(row: Payout) {
    const lista = reasons.map((x, i) => `${i + 1}. ${x.key}`).join('\n')
    const escolha = window.prompt(`Motivo da retenção (o produtor lê o texto correspondente):\n${lista}`)
    const idx = Number(escolha) - 1
    if (!reasons[idx]) return
    const r = await apost(`producers/${row.producer_id}/payouts/hold`, {
      event_id: row.event_id,
      reason: reasons[idx].key,
    })
    if (!r.ok) window.alert(r.data?.error ?? 'Não foi possível reter.')
    load()
  }

  async function release(row: Payout) {
    const r = await apost(`producers/${row.producer_id}/payouts/release`, { event_id: row.event_id })
    if (!r.ok) window.alert(r.data?.error ?? 'Não foi possível soltar.')
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
          A bilheteria retém o valor das vendas e transfere depois que o evento acontece. Um repasse
          por evento: face vendido, menos o que foi estornado.
        </p>
        {total > 0 && (
          <p className="mt-3 text-sm">
            Vencido ou a vencer: <span className="font-medium">{brl(total)}</span>
          </p>
        )}
        <p className="mt-3 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          A transferência é feita por fora e registrada aqui. Não existe pagamento automático neste
          painel — nenhum botão move dinheiro.
        </p>

        {credits.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold">Créditos a recuperar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estornos que chegaram <strong>depois</strong> de o repasse do evento ter sido pago. Não
              são abatidos de nada automaticamente: não há repasse futuro garantido, e um desconto
              silencioso no evento seguinte é o tipo de número que ninguém aceita.
            </p>
            <ul className="mt-3 space-y-2">
              {credits.map((c) => (
                <li
                  key={c.order_id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
                >
                  <span>
                    {c.producer_name} · {c.event_title}
                    <span className="block text-xs text-muted-foreground">
                      desde {formatDate(c.created_at)}
                    </span>
                  </span>
                  <span className="font-medium">{brl(c.amount_cents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {rows === null && <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>}
        {rows?.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">Nenhum repasse em aberto no momento.</p>
        )}

        <ul className="mt-6 space-y-3">
          {rows?.map((row) => (
            <li
              key={row.event_id}
              className={`rounded-xl border p-4 ${row.overdue ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {row.event_title}
                  <span className="block text-xs text-muted-foreground">{row.producer_name}</span>
                </p>
                <p className="font-display text-lg font-semibold">{brl(row.net_due_cents)}</p>
              </div>

              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {ESTADO[row.status] ?? row.status}
                {row.due_at && <> · vence {formatDate(row.due_at)}</>}
                {row.overdue && <strong className="text-destructive">atrasado</strong>}
                {row.refunded_face_cents > 0 && <> · {brl(row.refunded_face_cents)} estornados</>}
              </p>
              {row.hold_message && (
                <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">{row.hold_message}</p>
              )}

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
                    <span className="text-xs uppercase text-muted-foreground">{row.pix_key_type}</span>
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

              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === 'pending' && !row.blocked && (
                  <Button size="sm" variant="outline" onClick={() => markPaid(row)}>
                    Registrar transferência feita
                  </Button>
                )}
                {row.status === 'on_hold' ? (
                  <Button size="sm" variant="outline" onClick={() => release(row)}>
                    <PlayCircle className="size-4" /> Soltar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => hold(row)}>
                    <PauseCircle className="size-4" /> Reter
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
