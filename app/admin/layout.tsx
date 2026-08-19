export const metadata = { title: 'Admin da plataforma' }

// O admin segue o tema global (toggle claro/escuro) — não força cor.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
