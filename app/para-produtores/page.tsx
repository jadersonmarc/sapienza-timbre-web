'use client'

import { useState } from 'react'
import { Check, ShieldCheck, Smartphone, Wallet } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { producerSignup } from '@/lib/client'

// Landing B2B — segue o tema global (escuro no público), com o mesmo chrome do resto do site.
// CTA real: cadastro público que cria produtor pendente de aprovação (§3.12). Sem tabela de
// preço final (§3.13) — seção marcada como em construção.
export default function ParaProdutoresPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4">
        <section className="py-16 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Sua bilheteria, do seu jeito.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Venda ingressos com repasse rápido, portaria que funciona offline e ingressos que o
            público leva no celular. Sem letra miúda.
          </p>
          <a href="#cadastro" className="mt-6 inline-block">
            <Button size="lg">Criar minha conta de produtor</Button>
          </a>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Feature icon={<Smartphone className="size-5" />} title="Portaria offline" desc="Valide ingressos na entrada mesmo sem internet no local." />
          <Feature icon={<Wallet className="size-5" />} title="Repasse claro" desc="Acompanhe vendas e repasses em tempo real no painel." />
          <Feature icon={<ShieldCheck className="size-5" />} title="Ingresso seguro" desc="Cada ingresso é assinado e verificável — sem fraude." />
        </section>

        {/* Preço — BLOQUEADO (§3.13). Não inventar número. */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold">Planos e taxas</h2>
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <p className="font-medium">Tabela em construção</p>
            <p className="mt-1 text-sm">
              Estamos finalizando as condições comerciais. Cadastre-se e falamos com você com os
              valores antes de qualquer cobrança.
            </p>
          </div>
        </section>

        {/* Cadastro */}
        <section id="cadastro" className="mt-16 pb-24">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold">Criar conta de produtor</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua conta entra em análise e é liberada após aprovação.
            </p>
            <SignupForm />
          </div>
        </section>
      </main>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div>
      <h3 className="mt-3 font-display font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!name || !email || password.length < 8) {
      setError('Preencha nome, e-mail e uma senha de ao menos 8 caracteres.')
      return
    }
    setBusy(true)
    const { ok, status } = await producerSignup(name, email, password)
    setBusy(false)
    if (ok) {
      setDone(true)
      return
    }
    setError(status === 409 ? 'Este e-mail já tem cadastro.' : 'Não foi possível cadastrar agora.')
  }

  if (done) {
    return (
      <div className="mt-5 rounded-xl bg-primary/10 p-4 text-center text-sm">
        <Check className="mx-auto mb-2 size-6 text-primary" />
        Cadastro recebido! Assim que aprovarmos, você recebe o acesso ao painel.
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produtor/casa"
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail"
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Senha (mín. 8)"
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
      {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={busy} onClick={submit}>
        {busy ? 'Enviando…' : 'Criar conta'}
      </Button>
    </div>
  )
}
