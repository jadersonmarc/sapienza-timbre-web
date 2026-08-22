'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Mail, Ticket } from 'lucide-react'
import { Button } from './ui/button'
import { requestCode, verifyCode } from '@/lib/client'

const RESEND_SECONDS = 60

// Login do comprador por e-mail + código (OTP), embutido no checkout. Compra exige
// cadastro — após verificar, chama onAuthed para liberar o formulário de compra.
export function BuyerLogin({ onAuthed, onAuthStarted }: { onAuthed: () => void; onAuthStarted?: () => void }) {
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
      setError('Não foi possível enviar o código agora. Tente de novo.')
      return
    }
    // O trecho lento (esperar o e-mail, trocar de app) começa aqui: estende a reserva.
    onAuthStarted?.()
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
    onAuthed()
  }

  return (
    <div>
      <p className="flex items-center gap-2 font-medium">
        <Ticket className="size-5 text-primary" /> Entre para comprar
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Para comprar, você precisa estar logado. Enviamos um código para seu e-mail — sem senha.
      </p>

      {step === 'email' ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-sm"><Mail className="size-4" /> E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com"
              className="h-11 w-full rounded-lg border border-border bg-card px-3" />
          </label>
          {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={busy || !email} onClick={sendCode}>
            {busy ? 'Enviando…' : 'Enviar código'}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Enviamos um código para <strong>{email}</strong>. Digite abaixo.
          </p>
          <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000"
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-center font-mono text-lg tracking-widest" />
          {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={busy || code.length < 4} onClick={confirm}>
            {busy ? 'Verificando…' : 'Entrar'}
          </Button>
          <button onClick={sendCode} disabled={busy || resendIn > 0} className="w-full text-center text-sm text-muted-foreground disabled:opacity-60">
            {resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código'}
          </button>
          <button onClick={() => setStep('email')} className="w-full text-center text-sm text-muted-foreground">
            Usar outro e-mail
          </button>
        </div>
      )}
    </div>
  )
}
