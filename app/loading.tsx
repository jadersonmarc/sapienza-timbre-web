import { Loader2 } from 'lucide-react'

// Fallback global de navegação (Suspense). Leve: só um spinner centrado enquanto a rota
// monta o conteúdo no servidor.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
