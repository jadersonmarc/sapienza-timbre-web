'use client'

import { useState } from 'react'
import { UserRound } from 'lucide-react'
import type { Attendee } from '@/lib/client'
import { Button } from './ui/button'
import { maskCpf } from './buyer-account-form'

// Ficha por ingresso: quem compra quatro entradas diz quem usa cada uma. É esse nome que a
// portaria confere com o documento — sem ele, entradas do mesmo pedido são indistinguíveis
// e a meia-entrada não tem a quem ser cobrada.
export function AttendeeForm({
  quantity,
  halfQty,
  buyer,
  initial,
  onSubmit,
  busy,
}: {
  quantity: number
  halfQty: number
  buyer: { name: string; cpf: string; email: string }
  initial?: Attendee[]
  onSubmit: (list: Attendee[]) => void
  busy?: boolean
}) {
  const [list, setList] = useState<Attendee[]>(() => {
    const base = Array.from({ length: quantity }, (_, i) => initial?.[i] ?? { name: '', cpf: '', email: '' })
    // A primeira entrada costuma ser de quem está comprando: já vem preenchida, e quem
    // comprou para outra pessoa só sobrescreve.
    if (!initial?.length && buyer.name && base[0]) {
      base[0] = { name: buyer.name, cpf: maskCpf(buyer.cpf), email: buyer.email }
    }
    return base
  })

  function update(i: number, patch: Partial<Attendee>) {
    setList((l) => l.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  }

  const halfMarked = list.filter((a) => a.half_price).length
  const complete =
    list.every((a) => a.name.trim().split(/\s+/).length >= 2 && a.cpf.replace(/\D/g, '').length === 11) &&
    halfMarked === halfQty

  return (
    <div>
      <p className="font-display text-lg font-semibold">Quem vai usar os ingressos</p>
      <p className="mt-1 text-sm text-muted-foreground">
        O ingresso é nominal: na entrada, o nome é conferido com um documento com foto.
      </p>

      <div className="mt-4 space-y-4">
        {list.map((a, i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <UserRound className="size-4 text-muted-foreground" />
              Ingresso {i + 1}
              {i > 0 && (
                <button
                  className="ml-auto text-xs text-muted-foreground underline"
                  onClick={() => update(i, { name: buyer.name, cpf: maskCpf(buyer.cpf), email: buyer.email })}
                >
                  usar meus dados
                </button>
              )}
            </div>
            <input
              value={a.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Nome completo"
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              value={a.cpf}
              onChange={(e) => update(i, { cpf: maskCpf(e.target.value) })}
              placeholder="CPF"
              inputMode="numeric"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              value={a.email ?? ''}
              onChange={(e) => update(i, { email: e.target.value })}
              placeholder="E-mail (opcional — recebe o ingresso)"
              type="email"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
            />
            {halfQty > 0 && (
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!a.half_price}
                  onChange={(e) => update(i, { half_price: e.target.checked })}
                  className="mt-0.5 size-4"
                />
                <span>
                  Meia-entrada
                  <span className="block text-xs text-muted-foreground">
                    Esta pessoa apresenta o comprovante na entrada.
                  </span>
                </span>
              </label>
            )}
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!complete || busy}
        onClick={() => onSubmit(list.map((a) => ({ ...a, cpf: a.cpf.replace(/\D/g, '') })))}
      >
        {busy ? 'Aguarde…' : 'Ir para o pagamento'}
      </Button>
      {!complete && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {halfMarked !== halfQty && halfQty > 0
            ? `Marque quem tem direito à meia-entrada (${halfMarked} de ${halfQty}).`
            : 'Preencha nome completo e CPF de cada participante.'}
        </p>
      )}
    </div>
  )
}
