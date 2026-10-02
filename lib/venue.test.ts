import { describe, expect, it } from 'vitest'

import { editarNaMao, type Venue } from './venue'

describe('editarNaMao', () => {
  const daBusca: Venue = {
    venue_name: 'Circo Voador',
    address: 'R. dos Arcos, s/n - Lapa',
    city: 'Rio de Janeiro',
    place_id: 'ChIJ-circo',
    lat: -22.9133,
    lng: -43.1801,
  }

  it('trocar o endereço à mão solta o place_id e as coordenadas do lugar buscado', () => {
    const v = editarNaMao(daBusca, { address: 'Galpão 3, Rua Nova 10' })
    expect(v).toEqual({
      venue_name: 'Circo Voador',
      address: 'Galpão 3, Rua Nova 10',
      city: 'Rio de Janeiro',
      place_id: undefined,
      lat: null,
      lng: null,
    })
  })

  it('local sem cadastro no Google é caminho completo', () => {
    const vazio: Venue = { venue_name: '', address: '', city: '' }
    const v = editarNaMao(editarNaMao(editarNaMao(vazio, { venue_name: 'Galpão' }), { address: 'Rua Nova 10' }), { city: 'Niterói' })
    expect(v).toMatchObject({ venue_name: 'Galpão', address: 'Rua Nova 10', city: 'Niterói' })
    expect(v.place_id).toBeUndefined()
  })
})
