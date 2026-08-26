'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, X } from 'lucide-react'
import { aget, aput } from '@/lib/admin'
import { Button } from './ui/button'
import { brl } from '@/lib/format'

type Share = { artist_name: string; share_pct: number; amount_cents?: number }

// Rateio do line-up: quanto do valor de face cabe a cada artista. É INFORMATIVO — nenhum
// artista recebe pelo gateway, quem paga é o produtor. Serve para o acerto não depender de
// planilha paralela.
export function LineupEditor({ producerId, eventId }: { producerId: string; eventId: string }) {
  const [shares, setShares] = useState<Share[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const base = `producers/${producerId}/events/${eventId}/lineup`
  useEffect(() => {
    aget(base).then((r) => setShares(r.ok ? (r.data.shares ?? []) : []))
  }, [base])

  if (shares === null) return null

  const total = shares.reduce((a, s) => a + (Number(s.share_pct) || 0), 0)
  const excedeu = total > 100

  function update(i: number, patch: Partial<Share>) {
    setShares((l) => (l ?? []).map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  async function salvar() {
    const atuais = shares ?? []
    setBusy(true)
    setMsg('')
    const r = await aput(base, {
      shares: atuais.map((s) => ({ artist_name: s.artist_name, share_pct: Number(s.share_pct) || 0 })),
    })
    setBusy(false)
    setMsg(r.ok ? 'Rateio salvo.' : (r.data?.error ?? 'Não foi possível salvar.'))
    if (r.ok) aget(base).then((x) => x.ok && setShares(x.data.shares ?? []))
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-medium">
        <Users className="size-4 text-muted-foreground" /> Rateio do line-up
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Percentual sobre o valor de face vendido. Informativo: o pagamento aos artistas é feito pelo
        produtor, fora da plataforma.
      </p>

      <div className="mt-3 space-y-2">
        {shares.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={s.artist_name}
              onChange={(e) => update(i, { artist_name: e.target.value })}
              placeholder="Nome do artista"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={s.share_pct}
              onChange={(e) => update(i, { share_pct: Number(e.target.value.replace(/[^\d.]/g, '')) })}
              inputMode="decimal"
              className="h-10 w-20 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <span className="text-sm text-muted-foreground">%</span>
            {s.amount_cents !== undefined && s.amount_cents > 0 && (
              <span className="w-24 text-right text-xs text-muted-foreground">{brl(s.amount_cents)}</span>
            )}
            <button
              aria-label="Remover"
              onClick={() => setShares(shares.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShares([...shares, { artist_name: '', share_pct: 0 }])}
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <Plus className="size-4" /> Adicionar artista
      </button>

      <p className={`mt-3 text-sm ${excedeu ? 'text-destructive' : 'text-muted-foreground'}`}>
        Soma: {total.toFixed(2)}%{' '}
        {excedeu
          ? '— passa de 100% do face, o que não fecha.'
          : `· ${(100 - total).toFixed(2)}% fica com o produtor.`}
      </p>
      {msg && <p className="mt-2 text-sm">{msg}</p>}

      <Button size="sm" className="mt-3" disabled={busy || excedeu} onClick={salvar}>
        {busy ? 'Salvando…' : 'Salvar rateio'}
      </Button>
    </div>
  )
}
