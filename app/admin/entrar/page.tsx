'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminLogin } from '@/lib/admin'

export default function AdminEntrarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    setBusy(true)
    const ok = await adminLogin(email, password)
    setBusy(false)
    if (ok) router.push('/admin')
    else setError('Credenciais inválidas ou sem acesso.')
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 pt-16">
      <Link href="/" className="mb-6 flex items-center gap-2 font-display text-lg font-bold">
        <Shield className="size-5 text-primary" /> Timbre · Admin
      </Link>
      <h1 className="font-display text-2xl font-bold">Acesso da plataforma</h1>
      <p className="mt-1 text-sm text-muted-foreground">Operadores internos da Sapienza.</p>
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
      </div>
    </main>
  )
}
