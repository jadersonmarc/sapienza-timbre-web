'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { producerLogin } from '@/lib/producer'

export default function EntrarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    setBusy(true)
    const ok = await producerLogin(email, password)
    setBusy(false)
    if (ok) router.push('/painel')
    else setError('E-mail ou senha inválidos.')
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 pt-16">
      <Link href="/" className="mb-6 flex items-center gap-2 font-display text-lg font-bold">
        <Ticket className="size-5 text-primary" /> Timbre
      </Link>
      <h1 className="font-display text-2xl font-bold">Entrar no painel</h1>
      <p className="mt-1 text-sm text-muted-foreground">Acesso do produtor e da equipe.</p>
      <div className="mt-6 space-y-3">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail"
          className="h-12 w-full rounded-lg border border-border bg-card px-3" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="h-12 w-full rounded-lg border border-border bg-card px-3" />
        {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        <Button size="lg" className="w-full" disabled={busy || !email || !password} onClick={submit}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta? <Link href="/para-produtores" className="text-primary">Cadastre-se</Link>
        </p>
      </div>
    </main>
  )
}
