'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, KeyRound } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { requestCode, verifyCode } from '@/lib/client'

// Conta do comprador por e-mail + código (OTP). Sem senha. O vínculo com compras de
// convidado acontece no backend, só após a verificação (§3.4).
export default function ContaPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode() {
    setError('')
    setBusy(true)
    await requestCode(email)
    setBusy(false)
    setStep('code') // resposta é neutra; sempre avança
  }

  async function confirm() {
    setError('')
    setBusy(true)
    const { ok } = await verifyCode(email, code)
    setBusy(false)
    if (!ok) {
      setError('Código inválido ou expirado. Confira ou peça um novo.')
      return
    }
    router.push('/ingressos')
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 pt-16">
        <h1 className="font-display text-2xl font-bold">Entrar na sua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use seu e-mail. Enviamos um código de acesso — sem senha para lembrar.
        </p>

        {step === 'email' ? (
          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm"><Mail className="size-4" /> E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="h-12 w-full rounded-lg border border-border bg-card px-3"
              />
            </label>
            <Button size="lg" className="w-full" disabled={busy || !email} onClick={sendCode}>
              {busy ? 'Enviando…' : 'Enviar código'}
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Se houver conta ou não, enviamos um código para <strong>{email}</strong>. Digite abaixo.
            </p>
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm"><KeyRound className="size-4" /> Código</span>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="h-12 w-full rounded-lg border border-border bg-card px-3 text-center font-mono text-lg tracking-widest"
              />
            </label>
            {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
            <Button size="lg" className="w-full" disabled={busy || code.length < 4} onClick={confirm}>
              {busy ? 'Verificando…' : 'Entrar'}
            </Button>
            <button onClick={() => setStep('email')} className="w-full text-center text-sm text-muted-foreground">
              Usar outro e-mail
            </button>
          </div>
        )}
      </main>
    </>
  )
}
