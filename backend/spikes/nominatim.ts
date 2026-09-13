const USER_AGENT = 'CastLine-Spike/0.1 (contact: narcisodsalvador@gmail.com)'

export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) {
    throw new Error(`Nominatim request failed: ${res.status} ${res.statusText}`)
  }

  const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
  if (results.length === 0) return null

  const [first] = results
  return { lat: Number(first.lat), lon: Number(first.lon), displayName: first.display_name }
}

/**
 * Some beach names don't share OSM's town attribution (e.g. a beach commonly
 * associated with one town is actually tagged under a neighboring one), so a
 * "<name>, <city>, <state>" query can return zero results even though the
 * beach exists. Falls back to a state-only query when the full query misses.
 */
export async function geocodeWithFallback(
  name: string,
  city: string,
  state: string,
): Promise<{ result: GeocodeResult; queryUsed: string } | null> {
  const fullQuery = `${name}, ${city}, ${state}`
  const full = await geocode(fullQuery)
  if (full) return { result: full, queryUsed: fullQuery }

  await new Promise((resolve) => setTimeout(resolve, 1100))

  const stateQuery = `${name}, ${state}`
  const stateOnly = await geocode(stateQuery)
  if (stateOnly) return { result: stateOnly, queryUsed: stateQuery }

  return null
}
