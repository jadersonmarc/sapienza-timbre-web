import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from './route'

// B.8.1: a busca de local preenche o endereço e guarda o place_id; sem chave, cai para o
// manual. O Google é simulado — o que se testa é o nosso contrato com a tela.

function req(body: unknown) {
  return new NextRequest('http://localhost/api/places', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('sem chave configurada', () => {
  it('responde configured:false e não chama o Google', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '')
    const res = await POST(req({ input: 'Circo Voador', sessionToken: 's1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: false, suggestions: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('com chave configurada', () => {
  beforeEach(() => vi.stubEnv('GOOGLE_MAPS_API_KEY', 'chave-de-teste'))

  it('autocompleta com o token de sessão e a chave só no cabeçalho', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      suggestions: [{
        placePrediction: {
          placeId: 'ChIJ-circo',
          structuredFormat: { mainText: { text: 'Circo Voador' }, secondaryText: { text: 'Lapa, Rio de Janeiro' } },
        },
      }],
    }))
    const res = await POST(req({ input: 'Circo Vo', sessionToken: 'sessao-1' }))
    const data = await res.json()

    expect(data.suggestions).toEqual([{ place_id: 'ChIJ-circo', main: 'Circo Voador', secondary: 'Lapa, Rio de Janeiro' }])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).not.toContain('chave-de-teste')
    expect(init.headers['X-Goog-Api-Key']).toBe('chave-de-teste')
    expect(JSON.parse(init.body).sessionToken).toBe('sessao-1')
  })

  it('não cobra busca curta demais', async () => {
    const res = await POST(req({ input: 'Ci', sessionToken: 's' }))
    expect((await res.json()).suggestions).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a escolha preenche endereço, cidade, coordenadas e place_id, fechando a sessão', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      id: 'ChIJ-circo',
      displayName: { text: 'Circo Voador' },
      formattedAddress: 'R. dos Arcos, s/n - Lapa, Rio de Janeiro - RJ',
      location: { latitude: -22.9133, longitude: -43.1801 },
      addressComponents: [
        { longText: 'Lapa', types: ['sublocality'] },
        { longText: 'Rio de Janeiro', types: ['administrative_area_level_2'] },
      ],
    }))
    const res = await POST(req({ placeId: 'ChIJ-circo', sessionToken: 'sessao-1' }))
    const { place } = await res.json()

    expect(place).toEqual({
      place_id: 'ChIJ-circo',
      venue_name: 'Circo Voador',
      address: 'R. dos Arcos, s/n - Lapa, Rio de Janeiro - RJ',
      city: 'Rio de Janeiro',
      lat: -22.9133,
      lng: -43.1801,
    })
    expect(fetchMock.mock.calls[0][0]).toContain('sessionToken=sessao-1')
  })

  it('Google fora do ar não derruba a tela: avisa e deixa digitar', async () => {
    fetchMock.mockResolvedValueOnce(new Response('erro', { status: 503 }))
    const res = await POST(req({ input: 'Circo Voador', sessionToken: 's' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: true, suggestions: [], unavailable: true })
  })
})
