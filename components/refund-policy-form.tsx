'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { pget, psend } from '@/lib/producer'

type Policy = {
  withdrawal_window_days: number
  withdrawal_min_hours_before_event: number
  refund_gateway_fee_bearer: string
  producer_discretionary_enabled: boolean
  discretionary_response_hours: number
  checkin_blocks_refund: boolean
  inherited?: boolean
}

/**
 * Política de devolução — o que a casa promete ao comprador.
 *
 * Sem `eventId`, edita o PADRÃO do produtor, que todo evento herda. Com ele, edita a do
 * evento, que vence sobre o padrão. A distinção aparece na tela porque "não configurei" e
 * "configurei igual ao padrão" são estados diferentes: o primeiro acompanha mudanças
 * futuras do padrão, o segundo congela.
 *
 * A janela de arrependimento tem PISO de 7 dias e o campo não deixa descer — é o art. 49 do
 * CDC, e o servidor recusa de qualquer forma. Oferecer mais é direito do produtor.
 */
export function RefundPolicyForm({ eventId }: { eventId?: string }) {
  const path = eventId ? `events/${eventId}/refund-policy` : 'refund-policy'
  const [p, setP] = useState<Policy | null>(null)
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    pget(path).then((r) => {
      if (!r.ok) return
      setP(r.data.policy)
      setConfigured(!!r.data.configured)
    })
  }, [path])
  useEffect(load, [load])

  if (!p) return null

  const set = <K extends keyof Policy>(k: K, v: Policy[K]) => setP({ ...p, [k]: v })

  async function save() {
    setBusy(true)
    setMsg('')
    const r = await psend('PUT', path, p)
    setBusy(false)
    if (!r.ok) return setMsg(r.data?.error ?? 'Não foi possível salvar.')
    setMsg('Salvo.')
    load()
  }

  return (
    <div className="space-y-4">
      {eventId && !configured && (
        <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          Este evento está seguindo a política padrão da sua casa. Salvando aqui, ele passa a
          ter a própria — e deixa de acompanhar mudanças futuras do padrão.
        </p>
      )}

      <label className="block">
        <span className="text-sm font-medium">Devolução automática em até</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Contado da compra. Dentro desse prazo o dinheiro volta sem passar por você — é o
          direito de arrependimento (art. 49 do CDC), e o mínimo é 7 dias.
        </span>
        <div className="mt-1 flex items-center gap-2">
          <input type="number" min={7} max={365} value={p.withdrawal_window_days}
            onChange={(e) => set('withdrawal_window_days', Math.max(7, parseInt(e.target.value) || 7))}
            className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <span className="text-sm text-muted-foreground">dias</span>
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Antecedência mínima do evento</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          A devolução automática deixa de valer perto do evento. Zero = sem exigência.
        </span>
        <div className="mt-1 flex items-center gap-2">
          <input type="number" min={0} value={p.withdrawal_min_hours_before_event}
            onChange={(e) => set('withdrawal_min_hours_before_event', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <span className="text-sm text-muted-foreground">horas antes</span>
        </div>
      </label>

      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={p.producer_discretionary_enabled}
          onChange={(e) => set('producer_discretionary_enabled', e.target.checked)} />
        <span className="text-sm">
          Analisar pedidos feitos <strong>fora</strong> do prazo
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Desligado, o pedido fora do prazo é recusado na hora, com o motivo. Ligado, ele
            entra na sua fila de devoluções — e ficar sem resposta não aprova nada.
          </span>
        </span>
      </label>

      {p.producer_discretionary_enabled && (
        <label className="block">
          <span className="text-sm font-medium">Prazo para você responder</span>
          <div className="mt-1 flex items-center gap-2">
            <input type="number" min={1} value={p.discretionary_response_hours}
              onChange={(e) => set('discretionary_response_hours', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            <span className="text-sm text-muted-foreground">horas</span>
          </div>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Vencido, o pedido aparece como atrasado na fila. Ele nunca é aprovado sozinho.
          </span>
        </label>
      )}

      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={p.checkin_blocks_refund}
          onChange={(e) => set('checkin_blocks_refund', e.target.checked)} />
        <span className="text-sm">
          Ingresso que já entrou não é devolvido
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Quem passou na portaria consumiu o serviço. A plataforma ainda pode devolver em
            casos excepcionais.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar política'}</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  )
}
