// Formatação pt-BR / BRL (§4.3 — toda a superfície em português e real).

export function brl(cents?: number): string {
  if (cents === undefined || cents === null) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso?: string): string {
  if (!iso) return 'Data a confirmar'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Data a confirmar'
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso?: string): string {
  if (!iso) return 'Data a confirmar'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Data a confirmar'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CATEGORY_NAMES: Record<string, string> = {
  shows: 'Shows',
  teatro: 'Teatro',
  festas: 'Festas',
  esportes: 'Esportes',
  congressos: 'Congressos',
  cursos: 'Cursos',
  workshops: 'Workshops',
  gastronomia: 'Gastronomia',
}

export function categoryName(slug?: string): string {
  if (!slug) return ''
  return CATEGORY_NAMES[slug] ?? slug
}
