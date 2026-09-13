const USER_AGENT = 'CastLine/0.1 (contact: narcisodsalvador@gmail.com)'
const FALLBACK_DELAY_MS = 1100 // respect Nominatim's ~1 req/sec usage policy

export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

export interface GeocodeWithFallbackResult {
  result: GeocodeResult
  queryUsed: string
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
  sleepFn: (ms: number) => Promise<void> = sleep,
): Promise<GeocodeWithFallbackResult | null> {
  const fullQuery = `${name}, ${city}, ${state}`
  const full = await geocode(fullQuery)
  if (full) return { result: full, queryUsed: fullQuery }

  await sleepFn(FALLBACK_DELAY_MS)

  const stateQuery = `${name}, ${state}`
  const stateOnly = await geocode(stateQuery)
  if (stateOnly) return { result: stateOnly, queryUsed: stateQuery }

  return null
}
