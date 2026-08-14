import { ImageResponse } from 'next/og'
import { fetchEvent } from '@/lib/api'
import { formatDate } from '@/lib/format'

// OG dinâmico por evento (§3.6/§4.4). Só id validado (fetchEvent resolve na API pública —
// sem URL/texto livre de entrada, anti-SSRF §4.1). Persistida por ISR (§4.2).
export const runtime = 'nodejs'
export const revalidate = 3600
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Evento no Timbre'

type Params = Promise<{ id: string }>

export default async function OpengraphImage({ params }: { params: Params }) {
  const { id } = await params
  const detail = await fetchEvent(id)
  const title = detail?.event.title ?? 'Timbre'
  const cover = detail?.event.cover_url
  const when = formatDate(detail?.event.starts_at)
  const city = detail?.event.city

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backgroundColor: '#0E1116',
          backgroundImage: cover ? `url(${cover})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {/* Scrim para legibilidade sobre a imagem do cartaz. */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,17,22,0.95), rgba(14,17,22,0.15))', display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', padding: 64, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#3A9BA0', fontSize: 30, fontWeight: 700 }}>
            Timbre
          </div>
          <div style={{ display: 'flex', color: 'white', fontSize: 68, fontWeight: 800, lineHeight: 1.05, marginTop: 12 }}>
            {title.slice(0, 80)}
          </div>
          <div style={{ display: 'flex', color: '#D7DCE2', fontSize: 32, marginTop: 16 }}>
            {[when, city].filter(Boolean).join('  ·  ')}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
