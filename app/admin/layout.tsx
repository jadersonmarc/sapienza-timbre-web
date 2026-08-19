export const metadata = { title: 'Admin da plataforma' }

// O admin é B2B → tema CLARO forçado (mesmo padrão do /painel).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="light min-h-screen bg-background text-foreground">{children}</div>
}
