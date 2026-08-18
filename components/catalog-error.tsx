import { TriangleAlert } from 'lucide-react'

// Banner de catálogo indisponível (API fora / rede). Distinto do estado "vazio real":
// aqui o site não conseguiu falar com o backend, então não afirma "não há eventos".
export function CatalogError() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-signal/40 bg-signal/10 p-4 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-signal" />
      <div>
        <p className="font-medium">Não conseguimos carregar o catálogo.</p>
        <p className="text-muted-foreground">Verifique sua conexão e recarregue a página.</p>
      </div>
    </div>
  )
}
