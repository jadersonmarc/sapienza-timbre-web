'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Loader2 } from 'lucide-react'
import { checkoutStatus } from '@/lib/client'

// Espera ativa do Pix (§3.9): QR grande + código copiável + confirmação automática por
// polling com backoff. Caminho claro se não confirmar.
export function PixWait({ orderId, pixCode, onPaid }: { orderId: string; pixCode: string; onPaid: () => void }) {
  const [qr, setQr] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const canceled = useRef(false)

  useEffect(() => {
    QRCode.toDataURL(pixCode, { width: 240, margin: 1 }).then(setQr).catch(() => {})
  }, [pixCode])

  useEffect(() => {
    canceled.current = false
    let delay = 2000
    const tick = async () => {
      if (canceled.current) return
      const { status } = await checkoutStatus(orderId)
      if (status === 'paid') {
        onPaid()
        return
      }
      setElapsed((e) => e + delay / 1000)
      delay = Math.min(delay + 1000, 8000) // backoff
      if (!canceled.current) setTimeout(tick, delay)
    }
    const id = setTimeout(tick, delay)
    return () => {
      canceled.current = true
      clearTimeout(id)
    }
  }, [orderId, onPaid])

  const copy = () => {
    navigator.clipboard.writeText(pixCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="text-center">
      <p className="font-display text-lg font-semibold">Pague com Pix para confirmar</p>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR Code do Pix" className="mx-auto mt-4 rounded-lg bg-white p-2" width={240} height={240} />
      )}
      <button
        onClick={copy}
        className="mx-auto mt-4 flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm"
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        {copied ? 'Código copiado' : 'Copiar código Pix'}
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Aguardando confirmação…
      </p>
      {elapsed > 90 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Ainda não caiu? Assim que o banco confirmar, seu ingresso aparece automaticamente em
          “Meus ingressos”. Você pode fechar esta tela.
        </p>
      )}
    </div>
  )
}
