import type { MetadataRoute } from 'next'

// Manifesto PWA — a área de ingressos é instalável e abre offline (§3.5).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Timbre — ingressos',
    short_name: 'Timbre',
    description: 'Seus ingressos, sempre à mão — até sem sinal.',
    start_url: '/ingressos',
    display: 'standalone',
    background_color: '#0E1116',
    theme_color: '#0E1116',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
