'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, KeyRound } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { requestCode, verifyCode } from '@/lib/client'

const RESEND_SECONDS = 60

// Conta do comprador por e-mail + código (OTP). Sem senha. Erro de rede é distinto de
// "não existe conta" (a resposta do envio é neutra), então só avançamos quando o código
// realmente saiu; reenvio com espera e expiração visível.
export default function ContaPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [resendIn])

  async function sendCode() {
    setError('')
    setBusy(true)
    const ok = await requestCode(email)
    setBusy(false)
    if (!ok) {
      setError('Não foi possível enviar o código agora. Verifique sua conexão e tente de novo.')
      return
    }
    setStep('code')
    setResendIn(RESEND_SECONDS)
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
                placeholder="voce@exemplo.com"
                className="h-12 w-full rounded-lg border border-border bg-card px-3"
              />
            </label>
            {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
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
            <button
              onClick={sendCode}
              disabled={busy || resendIn > 0}
              className="w-full text-center text-sm text-muted-foreground disabled:opacity-60"
            >
              {resendIn > 0 ? `Reenviar código em ${resendIn}s` : 'Reenviar código'}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              O código expira em alguns minutos. Você pode pedir outro quando quiser.
            </p>
            <button onClick={() => setStep('email')} className="w-full text-center text-sm text-muted-foreground">
              Usar outro e-mail
            </button>
          </div>
        )}
      </main>
    </>
  )
}
