'use client'

import { useEffect, useState } from 'react'
import { Wallet, TriangleAlert, CheckCircle2 } from 'lucide-react'
import { pget, ppost } from '@/lib/producer'
import { Button } from './ui/button'

const KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Celular' },
  { value: 'random', label: 'Chave aleatória' },
]

// Para onde vai o dinheiro do produtor. Enquanto isso não estiver preenchido ele monta
// eventos mas não publica — e é melhor descobrir aqui do que no clique de publicar.
//
// É só a chave Pix, e é tudo: a bilheteria recebe o valor das vendas e transfere a parte do
// produtor depois que o evento acontece. Ele não abre conta em gateway nenhum.
export function ReceivingAccount({ onConfigured }: { onConfigured?: () => void }) {
  const [status, setStatus] = useState<{
    configured: boolean
    mode: string
    pix_key?: string
    holder_name?: string
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [f, setF] = useState({ pix_key: '', pix_key_type: 'cpf', holder_name: '', holder_tax_id: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  async function load() {
    const r = await pget('producer/payout-account')
    if (r.ok) {
      setStatus(r.data)
      if (r.data.holder_name) setF((p) => ({ ...p, holder_name: r.data.holder_name }))
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function submit() {
    setError('')
    setBusy(true)
    const r = await ppost('producer/payout-account', {
      ...f,
      pix_key: f.pix_key.trim(),
      holder_tax_id: f.holder_tax_id.replace(/\D/g, ''),
    })
    setBusy(false)
    if (!r.ok) {
      setError(r.data?.error || 'Não foi possível salvar os dados de repasse.')
      return
    }
    await load()
    setOpen(false)
    onConfigured?.()
  }

  if (!status) return null

  if (status.configured && !open) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-primary" />
          <>
            Repasse por Pix para <span className="font-medium text-foreground">{status.pix_key}</span>
          </>
          <button className="ml-auto text-xs text-muted-foreground underline" onClick={() => setOpen(true)}>
            alterar
          </button>
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
        <p className="flex items-center gap-2 font-medium">
          <TriangleAlert className="size-4" /> Falta dizer para onde vai o seu dinheiro
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Você pode montar seus eventos agora, mas para publicá-los precisamos da sua chave Pix — é
          para ela que transferimos a sua parte, alguns dias depois de cada evento acontecer.
        </p>
        <Button className="mt-3" onClick={() => setOpen(true)}>
          <Wallet className="size-4" /> Informar chave Pix
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <p className="font-display text-lg font-semibold">Dados de repasse</p>
      <p className="mt-1 text-sm text-muted-foreground">
        A chave precisa ser do mesmo titular do documento — é assim que fica registrado de quem é o
        dinheiro.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">Tipo de chave</span>
          <select
            value={f.pix_key_type}
            onChange={(e) => set('pix_key_type')(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {KEY_TYPES.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Chave Pix" value={f.pix_key} onChange={set('pix_key')} />
        <Field label="Nome do titular" value={f.holder_name} onChange={set('holder_name')} />
        <Field label="CPF/CNPJ do titular" value={f.holder_tax_id} onChange={set('holder_tax_id')} inputMode="numeric" />
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button disabled={busy} onClick={submit}>
          {busy ? 'Salvando…' : 'Salvar'}
        </Button>
        {status.configured && (
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        )}
      </div>
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
