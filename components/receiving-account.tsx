'use client'

import { useEffect, useState } from 'react'
import { Wallet, TriangleAlert, CheckCircle2 } from 'lucide-react'
import { pget, ppost } from '@/lib/producer'
import { Button } from './ui/button'

// Onde o dinheiro das vendas cai. Enquanto não estiver preenchido, o produtor não consegue
// publicar — e é melhor ele descobrir aqui, montando o evento, do que no clique de publicar.
//
// Dois caminhos: quem já tem conta no Asaas informa o identificador dela; quem não tem abre
// a conta por aqui mesmo, com os dados que o banco exige para saber de quem é o dinheiro.
export function ReceivingAccount({ onConfigured }: { onConfigured?: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'existing'>('create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const [walletId, setWalletId] = useState('')
  const [f, setF] = useState({
    legal_name: '',
    tax_id: '',
    email: '',
    mobile_phone: '',
    birth_date: '',
    company_type: 'MEI',
    income: '',
    postal_code: '',
    address: '',
    address_number: '',
    province: '',
  })
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    pget('producer/receiving-account').then((r) => r.ok && setConfigured(!!r.data.configured))
  }, [])

  const taxDigits = f.tax_id.replace(/\D/g, '')
  const isCompany = taxDigits.length > 11

  async function submit() {
    setError('')
    setDone('')
    setBusy(true)
    const body =
      mode === 'existing'
        ? { wallet_id: walletId.trim() }
        : {
            legal_name: f.legal_name,
            tax_id: taxDigits,
            email: f.email,
            mobile_phone: f.mobile_phone.replace(/\D/g, ''),
            birth_date: isCompany ? '' : f.birth_date,
            company_type: isCompany ? f.company_type : '',
            income_cents: Math.round(parseFloat(f.income.replace(/\./g, '').replace(',', '.') || '0') * 100),
            postal_code: f.postal_code.replace(/\D/g, ''),
            address: f.address,
            address_number: f.address_number,
            province: f.province,
          }
    const r = await ppost('producer/receiving-account', body)
    setBusy(false)
    if (!r.ok) {
      setError(r.data?.error || 'Não foi possível salvar os dados de recebimento.')
      return
    }
    setConfigured(true)
    setOpen(false)
    setDone(
      r.data.created
        ? 'Conta de recebimento criada. Você vai receber um e-mail do Asaas para acessá-la e concluir a verificação de documentos — ela é necessária para sacar.'
        : 'Conta de recebimento registrada.',
    )
    onConfigured?.()
  }

  if (configured === null) return null

  if (configured && !open) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-primary" />
          Recebimento configurado.
          <button className="ml-auto text-xs text-muted-foreground underline" onClick={() => setOpen(true)}>
            alterar
          </button>
        </p>
        {done && <p className="mt-2 text-xs text-muted-foreground">{done}</p>}
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
          Você pode montar seus eventos normalmente, mas para publicá-los precisamos da sua conta de
          recebimento — é nela que cai a sua parte de cada venda, automaticamente.
        </p>
        <Button className="mt-3" onClick={() => setOpen(true)}>
          <Wallet className="size-4" /> Configurar recebimento
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <p className="font-display text-lg font-semibold">Dados de recebimento</p>
      <div className="mt-3 flex gap-2">
        <Tab active={mode === 'create'} onClick={() => setMode('create')}>
          Abrir conta
        </Tab>
        <Tab active={mode === 'existing'} onClick={() => setMode('existing')}>
          Já tenho conta Asaas
        </Tab>
      </div>

      {mode === 'existing' ? (
        <div className="mt-4">
          <Field label="Wallet ID da sua conta Asaas" value={walletId} onChange={setWalletId} placeholder="00000000-0000-0000-0000-000000000000" />
          <p className="mt-1 text-xs text-muted-foreground">
            Está no painel do Asaas, em Integrações. É o identificador da conta que vai receber.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Abrimos a conta para você. Estes dados são exigidos por lei para o banco saber de quem é o
            dinheiro — a conta fica no seu nome e o acesso é seu.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Nome ou razão social" value={f.legal_name} onChange={set('legal_name')} />
            <Field label="CPF ou CNPJ" value={f.tax_id} onChange={set('tax_id')} inputMode="numeric" />
            {isCompany ? (
              <label className="block">
                <span className="mb-1 block text-sm text-muted-foreground">Tipo de empresa</span>
                <select
                  value={f.company_type}
                  onChange={(e) => set('company_type')(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="MEI">MEI</option>
                  <option value="LIMITED">Limitada</option>
                  <option value="INDIVIDUAL">Empresário individual</option>
                  <option value="ASSOCIATION">Associação</option>
                </select>
              </label>
            ) : (
              <Field label="Data de nascimento" value={f.birth_date} onChange={set('birth_date')} type="date" />
            )}
            <Field label="E-mail financeiro" value={f.email} onChange={set('email')} type="email" />
            <Field label="Celular" value={f.mobile_phone} onChange={set('mobile_phone')} inputMode="numeric" />
            <Field label="Faturamento mensal (R$)" value={f.income} onChange={set('income')} inputMode="decimal" placeholder="5000,00" />
            <Field label="CEP" value={f.postal_code} onChange={set('postal_code')} inputMode="numeric" />
            <Field label="Endereço" value={f.address} onChange={set('address')} />
            <Field label="Número" value={f.address_number} onChange={set('address_number')} inputMode="numeric" />
            <Field label="Bairro" value={f.province} onChange={set('province')} />
          </div>
        </>
      )}

      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button disabled={busy} onClick={submit}>
          {busy ? 'Salvando…' : 'Salvar'}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${active ? 'border-primary bg-primary/10 font-medium' : 'border-border text-muted-foreground'}`}
    >
      {children}
    </button>
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
