'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

// Compartilhar nativo do dispositivo (com fallback de copiar link).
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button onClick={share} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm">
      {copied ? <Check className="size-4 text-primary" /> : <Share2 className="size-4" />}
      {copied ? 'Link copiado' : 'Compartilhar'}
    </button>
  )
}
