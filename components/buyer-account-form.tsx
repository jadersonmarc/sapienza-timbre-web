'use client'

import { useState } from 'react'
import { register, login, updateMe } from '@/lib/client'
import { Button } from './ui/button'

// Cadastro do comprador dentro do checkout. A pessoa escolheu os ingressos e a reserva está
// correndo, então o formulário pede de uma vez tudo o que a compra precisa — nome, CPF,
// telefone e nascimento vão para a cobrança e para a portaria — e cria a conta já logada.
// Quem já tem conta entra pela senha, sem sair da página.
export function BuyerAccountForm({
  onReady,
  onStarted,
  complete,
  initial,
}: {
  onReady: () => void
  onStarted?: () => void
  // complete = a conta existe mas está sem os dados que a cobrança exige (contas antigas,
  // criadas só com e-mail). Aqui não se cria conta nem se pede senha: completa-se a que já
  // está aberta, sem tirar a pessoa do meio da compra.
  complete?: boolean
  initial?: { name?: string; cpf?: string; phone?: string; birth_date?: string }
}) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    email: '',
    cpf: initial?.cpf ? maskCpf(initial.cpf) : '',
    phone: initial?.phone ? maskPhone(initial.phone) : '',
    birth_date: initial?.birth_date ?? '',
    password: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const cpfDigits = form.cpf.replace(/\D/g, '')
  const phoneDigits = form.phone.replace(/\D/g, '')
  const dataComplete =
    form.name.trim().split(/\s+/).length >= 2 &&
    cpfDigits.length === 11 &&
    phoneDigits.length >= 10 &&
    form.birth_date.length === 10
  const canSignup = dataComplete && form.email.includes('@') && form.password.length >= 8
  const canSignin = form.email.includes('@') && form.password.length >= 1
  const canSubmit = complete ? dataComplete : mode === 'signup' ? canSignup : canSignin

  async function submit() {
    setError('')
    setBusy(true)
    onStarted?.()
    const res = complete
      ? await updateMe({ name: form.name, cpf: cpfDigits, phone: phoneDigits, birth_date: form.birth_date })
      : mode === 'signup'
        ? await register({ ...form, cpf: cpfDigits, phone: phoneDigits })
        : await login(form.email, form.password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error || 'Não foi possível continuar. Tente de novo.')
      return
    }
    onReady()
  }

  return (
    <div>
      {complete ? (
        <div className="mb-4">
          <p className="font-display text-lg font-semibold">Complete seu cadastro</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua conta foi criada só com e-mail. Precisamos destes dados para emitir a cobrança no seu nome.
          </p>
        </div>
      ) : (
        <div className="mb-4 flex gap-2">
          <TabButton active={mode === 'signup'} onClick={() => setMode('signup')}>
            Criar conta
          </TabButton>
          <TabButton active={mode === 'signin'} onClick={() => setMode('signin')}>
            Já tenho conta
          </TabButton>
        </div>
      )}

      <div className="space-y-3">
        {(complete || mode === 'signup') && (
          <Field label="Nome completo" value={form.name} onChange={set('name')} autoComplete="name" placeholder="Como no documento" />
        )}
        {!complete && (
          <Field label="E-mail" value={form.email} onChange={set('email')} type="email" autoComplete="email" placeholder="voce@email.com" />
        )}
        {(complete || mode === 'signup') && (
          <>
            <Field
              label="CPF"
              value={form.cpf}
              onChange={(v) => set('cpf')(maskCpf(v))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              hint="Necessário para emitir a cobrança e para a meia-entrada."
            />
            <Field
              label="Celular"
              value={form.phone}
              onChange={(v) => set('phone')(maskPhone(v))}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(31) 90000-0000"
              hint="É por onde falamos com você no dia do evento."
            />
            <Field
              label="Data de nascimento"
              value={form.birth_date}
              onChange={set('birth_date')}
              type="date"
              autoComplete="bday"
            />
          </>
        )}
        {!complete && (
          <Field
            label="Senha"
            value={form.password}
            onChange={set('password')}
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'Ao menos 8 caracteres' : ''}
          />
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

      <Button size="lg" className="mt-4 w-full" disabled={busy || !canSubmit} onClick={submit}>
        {busy ? 'Aguarde…' : complete ? 'Salvar e continuar' : mode === 'signup' ? 'Criar conta e continuar' : 'Entrar e continuar'}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Sua reserva continua guardada enquanto você preenche.
      </p>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
  hint,
  ...rest
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
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
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

// Máscaras: reduzem erro de digitação num formulário que já é longo.
export function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}
