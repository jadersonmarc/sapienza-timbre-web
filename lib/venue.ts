export type Venue = {
  venue_name: string
  address: string
  city: string
  place_id?: string
  lat?: number | null
  lng?: number | null
}

/**
 * editarNaMao aplica uma edição manual ao local.
 *
 * Mexer no texto à mão desfaz o vínculo com o lugar da busca: o place_id e as coordenadas
 * eram DAQUELE lugar. Mantê-los depois de o produtor trocar o endereço gravaria um evento
 * dizendo uma rua e apontando o mapa para outra.
 */
export function editarNaMao(value: Venue, patch: Partial<Pick<Venue, 'venue_name' | 'address' | 'city'>>): Venue {
  return { ...value, ...patch, place_id: undefined, lat: null, lng: null }
}
