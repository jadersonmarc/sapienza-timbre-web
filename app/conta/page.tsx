'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, KeyRound } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { BuyerAccountForm } from '@/components/buyer-account-form'
import { Button } from '@/components/ui/button'
import { requestCode, resetPassword } from '@/lib/client'

const RESEND_SECONDS = 60

// Conta do comprador: cadastro e entrada por senha. O código por e-mail continua existindo,
// mas no papel de saída de emergência — quem esqueceu a senha entra por ele. A resposta do
// envio é neutra (não revela se há cadastro), então só avançamos quando o pedido saiu.
export default function ContaPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'password' | 'code'>('password')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
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

  // O código prova o e-mail e serve para DEFINIR a senha nova. Só entrar deixaria a senha
  // perdida e a próxima visita dependendo de outro e-mail.
  async function confirm() {
    setError('')
    setBusy(true)
    const { ok, error: err } = await resetPassword(email, code, newPassword)
    setBusy(false)
    if (!ok) {
      setError(err || 'Código inválido ou expirado. Confira ou peça um novo.')
      return
    }
    router.push('/ingressos')
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 pt-16">
        <h1 className="font-display text-2xl font-bold">Sua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seus ingressos ficam guardados aqui — funcionam até sem sinal no dia do evento.
        </p>

        {mode === 'password' ? (
          <div className="mt-6">
            <BuyerAccountForm onReady={() => router.push('/ingressos')} />
            <button className="mt-4 w-full text-center text-sm text-muted-foreground underline" onClick={() => setMode('code')}>
              Esqueci minha senha
            </button>
          </div>
        ) : step === 'email' ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Enviamos um código para o seu e-mail e você define uma senha nova.
            </p>
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm">
                <Mail className="size-4" /> E-mail
              </span>
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
            <button className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setMode('password')}>
              Voltar para a senha
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Se houver conta ou não, enviamos um código para <strong>{email}</strong>. Digite abaixo.
            </p>
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm">
                <KeyRound className="size-4" /> Código
              </span>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="h-12 w-full rounded-lg border border-border bg-card px-3 text-center font-mono text-lg tracking-widest"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted-foreground">Nova senha</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Ao menos 8 caracteres"
                className="h-12 w-full rounded-lg border border-border bg-card px-3"
              />
            </label>
            {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
            <Button
              size="lg"
              className="w-full"
              disabled={busy || code.length < 4 || newPassword.length < 8}
              onClick={confirm}
            >
              {busy ? 'Salvando…' : 'Definir senha e entrar'}
            </Button>
            <button
              className="w-full text-center text-sm text-muted-foreground underline disabled:opacity-50"
              disabled={resendIn > 0}
              onClick={sendCode}
            >
              {resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código'}
            </button>
          </div>
        )}
      </main>
    </>
  )
}
