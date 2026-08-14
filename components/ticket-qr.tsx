'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Sun } from 'lucide-react'

// QR do ingresso: grande, alto contraste, com aviso de brilho (§4.3). Gerado no cliente a
// partir do token assinado (Ed25519) — funciona offline, e a portaria valida sem rede.
export function TicketQR({ token }: { token: string }) {
  const [qr, setQr] = useState('')
  useEffect(() => {
    QRCode.toDataURL(token, { width: 320, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => {})
  }, [token])
  return (
    <div className="mt-4 text-center">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR do ingresso" width={280} height={280} className="mx-auto rounded-xl bg-white p-3" />
      )}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Sun className="size-3.5" /> Aumente o brilho da tela na entrada.
      </p>
    </div>
  )
}
