'use client'

import { Printer } from 'lucide-react'

// Botão de impressão: o organizador gera o PDF da página de atestado pelo navegador.
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
    >
      <Printer className="size-4" /> Imprimir / salvar PDF
    </button>
  )
}
