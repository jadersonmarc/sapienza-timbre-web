import { NextRequest, NextResponse } from 'next/server'

/**
 * Busca de local, por baixo do nosso servidor.
 *
 * A chave NUNCA vai para o bundle: o navegador chama esta rota, e é ela que fala com o
 * Google com a chave que só existe no servidor. Isso também é o que permite restringir a
 * chave por IP (a nossa saída) em vez de por origem — restrição de origem só protege chave
 * exposta, que é justamente o que estamos evitando.
 *
 * O autocompletar é cobrado POR SESSÃO: as digitações e a busca final de detalhes que
 * compartilham o mesmo `sessionToken` contam como uma. O token é gerado no navegador quando
 * o campo ganha foco e descartado quando o produtor escolhe um lugar — é o que transforma
 * "dez teclas, dez cobranças" em "um endereço, uma cobrança".
 *
 * Sem GOOGLE_MAPS_API_KEY, responde 200 com `configured: false`. A tela cai para digitação
 * manual sem quebrar — e a inserção manual é caminho completo, não remendo: local sem
 * cadastro no Google precisa funcionar.
 */

const AUTOCOMPLETE = 'https://places.googleapis.com/v1/places:autocomplete'
const DETAILS = 'https://places.googleapis.com/v1/places/'

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return NextResponse.json({ configured: false, suggestions: [] })
  }
  let body: { input?: string; placeId?: string; sessionToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 })
  }
  const sessionToken = String(body.sessionToken ?? '').slice(0, 64)

  // Detalhes de um lugar escolhido: encerra a sessão de cobrança.
  if (body.placeId) {
    const id = encodeURIComponent(String(body.placeId))
    const res = await fetch(`${DETAILS}${id}?sessionToken=${encodeURIComponent(sessionToken)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents',
      },
    })
    if (!res.ok) return NextResponse.json({ error: 'lugar não encontrado' }, { status: 404 })
    const p = await res.json()
    return NextResponse.json({
      configured: true,
      place: {
        place_id: p.id,
        venue_name: p.displayName?.text ?? '',
        address: p.formattedAddress ?? '',
        city: cityOf(p.addressComponents),
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
      },
    })
  }

  const input = String(body.input ?? '').trim()
  if (input.length < 3) return NextResponse.json({ configured: true, suggestions: [] })

  const res = await fetch(AUTOCOMPLETE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ['br'],
      languageCode: 'pt-BR',
    }),
  })
  if (!res.ok) {
    // Indisponibilidade do serviço de busca não pode impedir de criar um evento: a tela
    // continua com a digitação manual.
    return NextResponse.json({ configured: true, suggestions: [], unavailable: true })
  }
  const data = await res.json()
  const suggestions = (data.suggestions ?? [])
    .map((s: { placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }) => s.placePrediction)
    .filter(Boolean)
    .slice(0, 6)
    .map((p: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } }) => ({
      place_id: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
    }))
  return NextResponse.json({ configured: true, suggestions })
}

/** cityOf extrai a cidade dos componentes do endereço. */
function cityOf(components?: { longText?: string; types?: string[] }[]): string {
  if (!components) return ''
  const hit = components.find((c) => (c.types ?? []).includes('administrative_area_level_2'))
    ?? components.find((c) => (c.types ?? []).includes('locality'))
  return hit?.longText ?? ''
}
