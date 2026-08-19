import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700'], display: 'swap', variable: '--font-display' })
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-mono' })

export const metadata: Metadata = {
  metadataBase: new URL('https://timbre.sapienzalabs.com.br'),
  title: {
    default: 'Timbre — ingressos para os melhores eventos',
    template: '%s · Timbre',
  },
  description:
    'Descubra shows, festas, teatro e mais. Compre seu ingresso em poucos toques e receba o QR no celular — funciona até sem sinal na porta.',
  applicationName: 'Timbre',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Timbre', statusBarStyle: 'black-translucent' },
  // Favicon/ícone do title = identidade da Sapienza (assets copiados de spa-sapienza).
  icons: {
    icon: [
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180' },
  },
}

export const viewport: Viewport = {
  themeColor: '#0E1116',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable} dark`}>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
