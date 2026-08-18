'use client'

import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'

// Error boundary global: captura erro de render/SSR e oferece "tentar de novo", em vez de
// tela quebrada. O digest/log fica só no console do servidor.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 pb-20 pt-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-signal/15 text-signal">
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não conseguimos carregar esta página. Tente de novo em instantes.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Tentar de novo
        </button>
      </main>
    </>
  )
}
