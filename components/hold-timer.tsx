'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

// Contagem do hold visível (§3.8). Informativo: ao zerar, avisa que a reserva pode ter
// expirado — o pagamento, se cair, ainda é honrado; senão o comprador recomeça.
export function HoldTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    setLeft(seconds)
    const id = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [seconds])

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className={`mb-4 flex items-center justify-center gap-2 rounded-lg py-2 text-sm ${left > 0 ? 'bg-secondary text-muted-foreground' : 'bg-signal/15 text-signal'}`}>
      <Clock className="size-4" />
      {left > 0 ? (
        <span>
          Reserva garantida por <span className="font-mono font-semibold">{mm}:{ss}</span>
        </span>
      ) : (
        <span>Tempo de reserva esgotado — conclua o pagamento ou recomece.</span>
      )}
    </div>
  )
}
