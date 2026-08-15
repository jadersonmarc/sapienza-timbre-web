'use client'

import { useState } from 'react'
import { Send, Tag } from 'lucide-react'
import { Button } from './ui/button'
import { transferTicket, sellTicket } from '@/lib/client'

// Ações de posse (Onda 2, custódia de plataforma): transferir (presente) e vender (mercado
// secundário). O que depende de rede fica fora — aqui é tudo on-platform.
export function TicketActions({ ticketId, onChanged }: { ticketId: string; onChanged: () => void }) {
  const [open, setOpen] = useState<'none' | 'transfer' | 'sell'>('none')
  const [email, setEmail] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function doTransfer() {
    setBusy(true)
    setMsg('')
    const { ok, status } = await transferTicket(ticketId, email)
    setBusy(false)
    if (ok) {
      setMsg('Transferido! O ingresso saiu da sua conta.')
      onChanged()
    } else setMsg(status === 409 ? 'Ainda não é transferível (janela de contestação) ou em disputa.' : 'Não foi possível transferir.')
  }

  async function doSell() {
    const cents = Math.round(parseFloat(price.replace(',', '.')) * 100)
    if (!cents || cents <= 0) {
      setMsg('Informe um preço válido.')
      return
    }
    setBusy(true)
    setMsg('')
    const { ok, status } = await sellTicket(ticketId, cents)
    setBusy(false)
    if (ok) {
      setMsg('Anunciado no mercado! Avisamos quando vender.')
      onChanged()
    } else setMsg(status === 400 ? 'Preço acima do teto de revenda.' : status === 409 ? 'Ainda não pode ser anunciado.' : 'Não foi possível anunciar.')
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex gap-2">
        <button onClick={() => setOpen(open === 'transfer' ? 'none' : 'transfer')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm">
          <Send className="size-4" /> Transferir
        </button>
        <button onClick={() => setOpen(open === 'sell' ? 'none' : 'sell')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm">
          <Tag className="size-4" /> Vender
        </button>
      </div>

      {open === 'transfer' && (
        <div className="mt-3 space-y-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de quem vai receber"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          <Button className="w-full" disabled={busy || !email} onClick={doTransfer}>
            {busy ? 'Transferindo…' : 'Confirmar transferência'}
          </Button>
        </div>
      )}

      {open === 'sell' && (
        <div className="mt-3 space-y-2">
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço (R$)"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          <p className="text-xs text-muted-foreground">Respeita o teto de revenda do evento. O royalty vai ao produtor.</p>
          <Button className="w-full" disabled={busy || !price} onClick={doSell}>
            {busy ? 'Anunciando…' : 'Anunciar à venda'}
          </Button>
        </div>
      )}

      {msg && <p className="mt-2 text-center text-sm text-muted-foreground">{msg}</p>}
    </div>
  )
}
