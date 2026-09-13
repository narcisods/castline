interface NoaaStation {
  id: string
  name: string
  lat: number
  lng: number
}

export interface NoaaStationDetails {
  id: string
  name: string
  type: 'R' | 'S' | string
  referenceId?: string
}

export async function getStationDetails(stationId: string): Promise<NoaaStationDetails> {
  const res = await fetch(
    `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${stationId}.json`,
  )
  if (!res.ok) throw new Error(`NOAA station details request failed: ${res.status}`)
  const data = (await res.json()) as {
    stations: Array<{ id: string; name: string; type: string; reference_id?: string }>
  }
  const [s] = data.stations
  return { id: s.id, name: s.name, type: s.type, referenceId: s.reference_id }
}

interface NoaaStationsResponse {
  stations: Array<{ id: string; name: string; lat: number; lng: number }>
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

let cachedStations: NoaaStation[] | null = null

async function fetchTidePredictionStations(): Promise<NoaaStation[]> {
  if (cachedStations) return cachedStations
  const res = await fetch(
    'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions',
  )
  if (!res.ok) throw new Error(`NOAA station list request failed: ${res.status}`)
  const data = (await res.json()) as NoaaStationsResponse
  cachedStations = data.stations
  return cachedStations
}

export async function findNearestTideStation(
  lat: number,
  lon: number,
): Promise<{ station: NoaaStation; distanceMiles: number }> {
  const stations = await fetchTidePredictionStations()
  let best: NoaaStation | null = null
  let bestDist = Infinity
  for (const s of stations) {
    const d = haversineMiles(lat, lon, s.lat, s.lng)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  if (!best) throw new Error('No NOAA tide stations found')
  return { station: best, distanceMiles: bestDist }
}

export interface TidePrediction {
  t: string
  v: string
  type?: string
}

export async function fetchTidePredictions(
  stationId: string,
  dateYYYYMMDD: string,
  interval: 'hilo' | 'h',
): Promise<TidePrediction[]> {
  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter')
  url.searchParams.set('product', 'predictions')
  url.searchParams.set('application', 'CastLine-Spike')
  url.searchParams.set('begin_date', dateYYYYMMDD)
  url.searchParams.set('end_date', dateYYYYMMDD)
  url.searchParams.set('datum', 'MLLW')
  url.searchParams.set('station', stationId)
  url.searchParams.set('time_zone', 'lst_ldt')
  url.searchParams.set('units', 'english')
  url.searchParams.set('interval', interval)
  url.searchParams.set('format', 'json')

  const res = await fetch(url)
  const data = (await res.json()) as { predictions?: TidePrediction[]; error?: { message: string } }
  if (data.error) throw new Error(`NOAA tide predictions error: ${data.error.message.trim()}`)
  if (!res.ok) throw new Error(`NOAA tide predictions request failed: ${res.status}`)
  return data.predictions ?? []
}
