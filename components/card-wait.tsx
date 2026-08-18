'use client'

import { useEffect, useRef, useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { checkoutStatus } from '@/lib/client'

// Pagamento via cartão: sem QR — o gateway confirma pelo webhook e o app acompanha pelo
// status com backoff. Estado distinto do Pix (§3.11), não reutiliza o QR/Pix code.
export function CardWait({ orderId, onPaid }: { orderId: string; onPaid: () => void }) {
  const [elapsed, setElapsed] = useState(0)
  const canceled = useRef(false)

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
      delay = Math.min(delay + 1000, 8000)
      if (!canceled.current) setTimeout(tick, delay)
    }
    const id = setTimeout(tick, delay)
    return () => {
      canceled.current = true
      clearTimeout(id)
    }
  }, [orderId, onPaid])

  return (
    <div className="text-center">
      <p className="font-display text-lg font-semibold">Pagamento em processamento</p>
      <div className="mx-auto mt-4 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <CreditCard className="size-6" />
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Aguardando confirmação da operadora…
      </p>
      {elapsed > 90 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Assim que a operadora confirmar, seu ingresso aparece automaticamente em “Meus
          ingressos”. Você pode fechar esta tela.
        </p>
      )}
    </div>
  )
}
