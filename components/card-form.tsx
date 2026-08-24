'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { brl } from '@/lib/format'
import { Button } from './ui/button'

export type CardInput = {
  holder_name: string
  number: string
  expiry_month: string
  expiry_year: string
  ccv: string
  postal_code: string
  address_number: string
}

// Cartão digitado aqui mesmo, sem trocar de site. Os dados vão numa única requisição ao
// nosso servidor e de lá ao provedor de pagamento — não ficam guardados nem aparecem em
// log. CEP e número do endereço são exigidos pelo antifraude do provedor.
export function CardForm({
  total,
  totalCents,
  maxInstallments = 1,
  minInstallmentCents = 500,
  busy,
  onSubmit,
}: {
  total: string
  totalCents: number
  maxInstallments?: number
  minInstallmentCents?: number
  busy?: boolean
  onSubmit: (c: CardInput, installments: number) => void
}) {
  const [installments, setInstallments] = useState(1)
  const [c, setC] = useState<CardInput>({
    holder_name: '',
    number: '',
    expiry_month: '',
    expiry_year: '',
    ccv: '',
    postal_code: '',
    address_number: '',
  })
  const set = (k: keyof CardInput) => (v: string) => setC((p) => ({ ...p, [k]: v }))

  const digits = (v: string) => v.replace(/\D/g, '')

  // Só oferece o que cabe no piso por parcela — a mesma regra que o servidor confere.
  const maxForTotal = Math.max(1, Math.min(maxInstallments, Math.floor(totalCents / minInstallmentCents)))
  const options = Array.from({ length: maxForTotal }, (_, i) => i + 1)
  const ready =
    digits(c.number).length >= 13 &&
    c.holder_name.trim().split(/\s+/).length >= 2 &&
    digits(c.expiry_month).length === 2 &&
    digits(c.expiry_year).length >= 2 &&
    digits(c.ccv).length >= 3 &&
    digits(c.postal_code).length === 8 &&
    c.address_number.trim() !== ''

  return (
    <div>
      <p className="font-display text-lg font-semibold">Pagamento com cartão</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> Seus dados são usados só para esta cobrança.
      </p>

      <div className="mt-4 space-y-3">
        <Field
          label="Número do cartão"
          value={c.number}
          onChange={(v) => set('number')(maskCard(v))}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
        />
        <Field
          label="Nome como está no cartão"
          value={c.holder_name}
          onChange={set('holder_name')}
          autoComplete="cc-name"
          placeholder="MARC SILVA"
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <Field
              label="Mês"
              value={c.expiry_month}
              onChange={(v) => set('expiry_month')(digits(v).slice(0, 2))}
              inputMode="numeric"
              autoComplete="cc-exp-month"
              placeholder="12"
            />
          </div>
          <div className="flex-1">
            <Field
              label="Ano"
              value={c.expiry_year}
              onChange={(v) => set('expiry_year')(digits(v).slice(0, 4))}
              inputMode="numeric"
              autoComplete="cc-exp-year"
              placeholder="2030"
            />
          </div>
          <div className="flex-1">
            <Field
              label="CVV"
              value={c.ccv}
              onChange={(v) => set('ccv')(digits(v).slice(0, 4))}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field
              label="CEP do titular"
              value={c.postal_code}
              onChange={(v) => set('postal_code')(maskCep(v))}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
            />
          </div>
          <div className="w-28">
            <Field label="Número" value={c.address_number} onChange={set('address_number')} inputMode="numeric" placeholder="100" />
          </div>
        </div>
      </div>

      {maxForTotal > 1 && (
        <label className="mt-3 block">
          <span className="mb-1 block text-sm text-muted-foreground">Parcelamento</span>
          <select
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? `À vista — ${total}` : `${n}× de ${brl(Math.round(totalCents / n))} sem juros`}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">
            O total é o mesmo em qualquer parcelamento.
          </span>
        </label>
      )}

      <Button size="lg" className="mt-4 w-full" disabled={!ready || busy} onClick={() => onSubmit(c, installments)}>
        {busy ? 'Processando…' : installments > 1 ? `Pagar ${installments}× de ${brl(Math.round(totalCents / installments))}` : `Pagar ${total}`}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        O CEP e o número são pedidos pelo antifraude do provedor de pagamento.
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string
  value: string
  onChange: (v: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted-foreground">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
      />
    </label>
  )
}

function maskCard(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim()
}

function maskCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}
