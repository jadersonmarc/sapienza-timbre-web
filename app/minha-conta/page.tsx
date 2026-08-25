'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ticket, Receipt, ShieldCheck, AlertCircle, LogOut, Trash2 } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { maskCpf, maskPhone } from '@/components/buyer-account-form'
import { fetchBuyerSession, updateMe, logout, clearAnonToken, deleteAccount, requestCode, verifyCode } from '@/lib/client'

type Me = {
  authed: boolean
  email?: string
  name?: string
  cpf?: string
  phone?: string
  birth_date?: string
  email_verified?: boolean
}

// Área da conta: onde a pessoa confere quem ela é para nós, corrige o que mudou e chega aos
// ingressos. Sem isso, depois de comprar só existia a lista de QRs — e nenhum lugar para
// trocar um telefone errado ou apagar a conta.
export default function MinhaContaPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', birth_date: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState('')

  const load = useCallback(async () => {
    const s = (await fetchBuyerSession()) as Me
    if (!s.authed) {
      router.replace('/conta')
      return
    }
    setMe(s)
    setForm({
      name: s.name ?? '',
      cpf: s.cpf ? maskCpf(s.cpf) : '',
      phone: s.phone ? maskPhone(s.phone) : '',
      birth_date: s.birth_date ?? '',
    })
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function save() {
    setError('')
    setMsg('')
    setBusy(true)
    const r = await updateMe({
      name: form.name,
      cpf: form.cpf.replace(/\D/g, ''),
      phone: form.phone.replace(/\D/g, ''),
      birth_date: form.birth_date,
    })
    setBusy(false)
    if (!r.ok) {
      setError(r.error || 'Não foi possível salvar.')
      return
    }
    setMsg('Dados atualizados.')
    load()
  }

  async function sendVerification() {
    if (!me?.email) return
    setError('')
    setMsg('')
    const ok = await requestCode(me.email)
    if (!ok) {
      setError('Não foi possível enviar o código agora.')
      return
    }
    setVerifying(true)
    setMsg('Enviamos um código para o seu e-mail.')
  }

  async function confirmVerification() {
    if (!me?.email) return
    setBusy(true)
    const { ok } = await verifyCode(me.email, code)
    setBusy(false)
    if (!ok) {
      setError('Código inválido ou expirado.')
      return
    }
    setVerifying(false)
    setCode('')
    setMsg('E-mail verificado.')
    load()
  }

  async function sair() {
    await logout()
    clearAnonToken()
    router.push('/')
  }

  async function apagar() {
    if (!window.confirm('Apagar sua conta? Seus ingressos deixam de ficar acessíveis por aqui e a ação não pode ser desfeita.')) {
      return
    }
    if (await deleteAccount()) {
      clearAnonToken()
      router.push('/')
      return
    }
    setError('Não foi possível apagar a conta agora.')
  }

  if (!me) return null

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-10">
        <h1 className="font-display text-2xl font-bold">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">{me.email}</p>

        {/* Atalho para o que a pessoa mais vem fazer aqui. */}
        <Link href="/ingressos" className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary">
          <Ticket className="size-5 text-primary" />
          <span>
            <span className="block font-medium">Meus ingressos</span>
            <span className="block text-sm text-muted-foreground">Abrem sem sinal no dia do evento.</span>
          </span>
        </Link>

        <Link href="/pedidos" className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary">
          <Receipt className="size-5 text-primary" />
          <span>
            <span className="block font-medium">Meus pedidos</span>
            <span className="block text-sm text-muted-foreground">O que você comprou e quanto pagou.</span>
          </span>
        </Link>

        {/* Verificação do e-mail: é o que garante o acesso aos ingressos se a senha se perder. */}
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          {me.email_verified ? (
            <p className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-primary" /> E-mail verificado
            </p>
          ) : verifying ? (
            <div>
              <p className="text-sm">Digite o código que enviamos para {me.email}.</p>
              <div className="mt-2 flex gap-2">
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className="h-11 flex-1 rounded-lg border border-border bg-card px-3 text-center font-mono tracking-widest"
                />
                <Button disabled={busy || code.length < 4} onClick={confirmVerification}>
                  Verificar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4 text-signal" /> E-mail ainda não verificado
              </p>
              <Button size="sm" variant="outline" onClick={sendVerification}>
                Verificar agora
              </Button>
            </div>
          )}
        </div>

        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold">Seus dados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Usamos na emissão da cobrança e para falar com você no dia do evento.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field label="CPF" value={form.cpf} onChange={(v) => setForm((f) => ({ ...f, cpf: maskCpf(v) }))} inputMode="numeric" />
            <Field label="Celular" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: maskPhone(v) }))} inputMode="numeric" />
            <Field
              label="Data de nascimento"
              value={form.birth_date}
              onChange={(v) => setForm((f) => ({ ...f, birth_date: v }))}
              type="date"
            />
          </div>
          {error && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          {msg && <p className="mt-3 rounded-lg bg-secondary p-2 text-sm">{msg}</p>}
          <Button className="mt-3" disabled={busy} onClick={save}>
            {busy ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </section>

        <section className="mt-10 border-t border-border pt-6">
          <button onClick={sair} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="size-4" /> Sair da conta
          </button>
          <button onClick={apagar} className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <Trash2 className="size-4" /> Apagar minha conta
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            Apagar remove seus dados pessoais. Ingressos já usados permanecem no registro do evento,
            sem ligação com você.
          </p>
        </section>
      </main>
    </>
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
