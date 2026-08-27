'use client'

import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchRefundPolicy,
  requestRefund,
  type RefundPolicy,
  type RefundRequest,
} from '@/lib/client'
import { formatDateTime } from '@/lib/format'

const TRACK_LABEL: Record<string, string> = {
  withdrawal: 'Direito de arrependimento',
  discretionary: 'Análise do produtor',
  producer_initiated: 'Cancelado pelo produtor',
  admin_override: 'Decisão da plataforma',
}

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Aguardando resposta do produtor', tone: 'text-signal' },
  approved: { label: 'Aprovado', tone: 'text-primary' },
  processing: { label: 'Devolvendo', tone: 'text-signal' },
  completed: { label: 'Devolvido', tone: 'text-primary' },
  rejected: { label: 'Não aceito', tone: 'text-destructive' },
  failed: { label: 'Não foi possível concluir', tone: 'text-destructive' },
}

/**
 * Pedido de devolução do comprador.
 *
 * A política da casa é mostrada ANTES de confirmar, em texto: o que muda entre pedir hoje e
 * pedir depois do prazo é grande demais para a pessoa descobrir só na resposta. Quem está
 * dentro da janela de arrependimento recebe o dinheiro de volta na hora — é direito, não
 * favor —, e quem está fora entra numa fila e é avisado disso antes de clicar.
 */
export function RefundRequestBox({
  orderId,
  eventId,
  existing,
  onDone,
}: {
  orderId: string
  eventId: string
  existing?: RefundRequest
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [policy, setPolicy] = useState<RefundPolicy | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && !policy) fetchRefundPolicy(eventId).then(setPolicy)
  }, [open, policy, eventId])

  if (existing) return <RequestStatus request={existing} />

  async function submit() {
    setBusy(true)
    setError('')
    const res = await requestRefund(orderId, reason)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setOpen(false)
    onDone()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <RotateCcw className="size-4" /> Pedir devolução
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-4">
      <h3 className="font-display text-sm font-semibold">Pedir devolução</h3>
      {policy ? (
        <PolicyText policy={policy} />
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Carregando as regras desta casa…</p>
      )}

      <label className="mt-3 block text-xs text-muted-foreground" htmlFor={`reason-${orderId}`}>
        Conte o motivo (ajuda o produtor a decidir)
      </label>
      <textarea
        id={`reason-${orderId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        className="mt-1 w-full rounded-lg border border-border bg-card p-2 text-sm"
        placeholder="Ex.: imprevisto de viagem"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button onClick={submit} disabled={busy} className="flex-1">
          {busy ? 'Enviando…' : 'Confirmar pedido'}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
          Voltar
        </Button>
      </div>
    </div>
  )
}

/** PolicyText diz, em português, o que a casa promete — antes de a pessoa confirmar. */
function PolicyText({ policy }: { policy: RefundPolicy }) {
  return (
    <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
      <p>
        Dentro de <strong className="text-foreground">{policy.withdrawal_window_days} dias</strong> da
        compra, a devolução é automática: o valor volta pelo mesmo meio de pagamento, sem
        depender de aprovação.
        {policy.withdrawal_min_hours_before_event > 0 && (
          <> Isso vale até {policy.withdrawal_min_hours_before_event}h antes do evento.</>
        )}
      </p>
      <p>
        {policy.accepts_requests_after_window
          ? 'Passado esse prazo, o pedido vai para análise do produtor, que pode aceitar ou não.'
          : 'Passado esse prazo, esta casa não aceita pedidos de devolução.'}
      </p>
      {policy.checkin_blocks_refund && (
        <p>Ingresso que já foi usado na entrada não é devolvido.</p>
      )}
    </div>
  )
}

/** RequestStatus é o pedido já aberto: em que pé está, e o motivo quando foi recusado. */
function RequestStatus({ request }: { request: RefundRequest }) {
  const st = STATUS_LABEL[request.status] ?? { label: request.status, tone: 'text-muted-foreground' }
  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Pedido de devolução</span>
        <span className={`text-sm ${st.tone}`}>{st.label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {TRACK_LABEL[request.track] ?? request.track} · aberto em{' '}
        {formatDateTime(request.created_at)}
      </p>
      {request.status === 'pending' && request.responds_by && (
        <p className="mt-1 text-xs text-muted-foreground">
          O produtor responde até {formatDateTime(request.responds_by)}.
        </p>
      )}
      {request.status === 'rejected' && request.decision_reason && (
        <p className="mt-2 text-xs">
          <span className="text-muted-foreground">Motivo:</span> {request.decision_reason}
        </p>
      )}
      {request.status === 'pending' && (
        <p className="mt-2 text-xs text-muted-foreground">
          Seu ingresso continua válido enquanto o pedido não for decidido.
        </p>
      )}
    </div>
  )
}
