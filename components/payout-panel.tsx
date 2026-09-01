'use client'

import { Banknote, Clock, PauseCircle, TriangleAlert } from 'lucide-react'
import { brl, formatDate } from '@/lib/format'

export type Payout = {
  event_id: string
  event_title?: string
  gross_face_cents: number
  refunded_face_cents: number
  platform_fee_cents: number
  gateway_fee_cents: number
  net_due_cents: number
  due_at?: string | null
  status: string
  hold_reason?: string
  hold_message?: string
  paid_at?: string | null
  paid_reference?: string
  payout_delay_days: number
  payout_delay_inherited: boolean
}

const ESTADO: Record<string, { label: string; hint: string }> = {
  accruing: {
    label: 'Acumulando',
    hint: 'O valor das vendas fica com a bilheteria até o evento acontecer. A data do repasse aparece aqui assim que ele acontecer.',
  },
  pending: { label: 'A receber', hint: 'O evento aconteceu. A transferência sai até a data abaixo.' },
  on_hold: { label: 'Retido', hint: '' },
  paid: { label: 'Pago', hint: '' },
  cancelled: {
    label: 'Cancelado',
    hint: 'O evento foi cancelado e o valor está voltando para os compradores. Não há repasse.',
  },
}

/**
 * Extrato do repasse de um evento.
 *
 * Sem esta tela, a retenção é indistinguível de "a plataforma está com o meu dinheiro e não
 * me explica nada" — que é a suspeita que uma bilheteria precisa não merecer. Então mostra as
 * quatro linhas que formam a conta, a data, e o motivo quando há retenção.
 */
export function PayoutPanel({ p }: { p: Payout }) {
  const estado = ESTADO[p.status] ?? { label: p.status, hint: '' }
  const retido = p.status === 'on_hold'
  const cancelado = p.status === 'cancelled'

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border p-4 ${
          retido ? 'border-signal/40 bg-signal/5' : 'border-border bg-card'
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {retido ? <PauseCircle className="size-4 text-signal" /> : <Banknote className="size-4" />}
            {estado.label}
          </p>
          <p className={`font-display text-2xl font-bold ${cancelado ? 'text-muted-foreground line-through' : ''}`}>
            {brl(p.net_due_cents)}
          </p>
        </div>

        {p.due_at && !cancelado && (
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            {p.status === 'paid' ? 'Pago' : 'Previsto para'} {formatDate(p.paid_at ?? p.due_at)}
            {p.paid_reference && (
              <span className="text-xs text-muted-foreground">· {p.paid_reference}</span>
            )}
          </p>
        )}
        {estado.hint && <p className="mt-2 text-sm text-muted-foreground">{estado.hint}</p>}
        {p.hold_message && (
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-signal/10 p-2 text-sm text-signal">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {p.hold_message}
          </p>
        )}
      </div>

      <dl className="rounded-xl border border-border bg-card p-4 text-sm">
        <Line label="Vendido (valor de face)" value={p.gross_face_cents} />
        {p.refunded_face_cents > 0 && (
          <Line label="Devolvido a compradores" value={-p.refunded_face_cents} negative />
        )}
        {p.gateway_fee_cents > 0 && (
          <Line
            label="Tarifa das devoluções"
            value={-p.gateway_fee_cents}
            negative
            hint="Conforme a política de devolução deste evento."
          />
        )}
        <Line label="Seu líquido" value={p.net_due_cents} strong />
        <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          A taxa de conveniência ({brl(p.platform_fee_cents)}) é paga pelo comprador e fica com a
          plataforma — ela nunca sai do seu valor de face.
        </div>
      </dl>

      {/* Mesmo indicador de nível da política de devolução: "não configurei" e "configurei
          igual ao padrão" são estados diferentes, e o produtor precisa saber qual é o dele. */}
      <p className="text-xs text-muted-foreground">
        {p.payout_delay_inherited ? (
          <>
            Prazo de repasse: <strong>{p.payout_delay_days} dias</strong> após o evento — seguindo o
            padrão da casa.
          </>
        ) : (
          <>
            Prazo de repasse: <strong>{p.payout_delay_days} dias</strong> após o evento — este evento
            tem o próprio prazo.
          </>
        )}
      </p>
    </div>
  )
}

function Line({
  label,
  value,
  strong,
  negative,
  hint,
}: {
  label: string
  value: number
  strong?: boolean
  negative?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className={strong ? 'font-medium' : 'text-muted-foreground'}>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </dt>
      <dd className={`${strong ? 'font-display font-semibold' : ''} ${negative ? 'text-destructive' : ''}`}>
        {brl(value)}
      </dd>
    </div>
  )
}
