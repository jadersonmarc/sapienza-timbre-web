import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Build standalone para o container (deploy no Coolify, runtime Node — OG via Satori).
  output: 'standalone',
  images: {
    // Capas de evento vêm de URLs de terceiros (cartaz/foto). Sem otimizador próprio no
    // container; permitir qualquer host https e deixar o cache do CDN/navegador cuidar.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}

export default nextConfig
