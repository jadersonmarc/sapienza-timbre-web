export const metadata = { title: 'Painel do produtor' }

// O painel é B2B → tema CLARO forçado (.light re-declara os tokens claros num subtree).
export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <div className="light min-h-screen bg-background text-foreground">{children}</div>
}
