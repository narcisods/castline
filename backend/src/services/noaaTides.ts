interface NoaaStationListEntry {
  id: string
  name: string
  lat: number
  lng: number
}

interface NoaaStationsResponse {
  stations: NoaaStationListEntry[]
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

let cachedStations: NoaaStationListEntry[] | null = null

async function fetchTidePredictionStations(): Promise<NoaaStationListEntry[]> {
  if (cachedStations) return cachedStations
  const res = await fetch(
    'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions',
  )
  if (!res.ok) throw new Error(`NOAA station list request failed: ${res.status}`)
  const data = (await res.json()) as NoaaStationsResponse
  cachedStations = data.stations
  return cachedStations
}

export interface NearestStation {
  id: string
  name: string
  distanceMiles: number
}

export async function findNearestTideStation(lat: number, lon: number): Promise<NearestStation> {
  const stations = await fetchTidePredictionStations()
  let best: NoaaStationListEntry | null = null
  let bestDist = Infinity
  for (const s of stations) {
    const d = haversineMiles(lat, lon, s.lat, s.lng)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  if (!best) throw new Error('No NOAA tide stations found')
  return { id: best.id, name: best.name, distanceMiles: bestDist }
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

export interface RawTidePrediction {
  t: string
  v: string
  type?: string
}

export async function fetchTidePredictions(
  stationId: string,
  dateYYYYMMDD: string,
  interval: 'hilo' | 'h',
): Promise<RawTidePrediction[]> {
  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter')
  url.searchParams.set('product', 'predictions')
  url.searchParams.set('application', 'CastLine')
  url.searchParams.set('begin_date', dateYYYYMMDD)
  url.searchParams.set('end_date', dateYYYYMMDD)
  url.searchParams.set('datum', 'MLLW')
  url.searchParams.set('station', stationId)
  url.searchParams.set('time_zone', 'lst_ldt')
  url.searchParams.set('units', 'english')
  url.searchParams.set('interval', interval)
  url.searchParams.set('format', 'json')

  const res = await fetch(url)
  const data = (await res.json()) as {
    predictions?: RawTidePrediction[]
    error?: { message: string }
  }
  if (data.error) throw new Error(`NOAA tide predictions error: ${data.error.message.trim()}`)
  if (!res.ok) throw new Error(`NOAA tide predictions request failed: ${res.status}`)
  return data.predictions ?? []
}

/**
 * NOAA's `v` field is a string; `Number('')` is `0`, not `NaN`. A blank or
 * malformed value should read as missing data, not as a real 0ft reading.
 */
export function parseNoaaNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

export interface HourlyTideCurveResult {
  hourly: RawTidePrediction[]
  hourlyCurveStationId: string
  usedReferenceFallback: boolean
  warning?: string
}

/**
 * Stations are either "reference" (type R, full hourly harmonic curve at any
 * datum) or "subordinate" (type S, hi/lo only in principle - computed as an
 * offset from a linked reference station). The nearest station to a beach is
 * often subordinate, but some subordinate stations serve interval=h directly
 * anyway, so the fallback only fires when the direct request actually fails -
 * it must never be assumed either way.
 */
export async function resolveHourlyTideCurve(
  stationId: string,
  details: NoaaStationDetails,
  dateYYYYMMDD: string,
): Promise<HourlyTideCurveResult> {
  try {
    const hourly = await fetchTidePredictions(stationId, dateYYYYMMDD, 'h')
    return { hourly, hourlyCurveStationId: stationId, usedReferenceFallback: false }
  } catch {
    if (details.type === 'S' && details.referenceId) {
      try {
        const hourly = await fetchTidePredictions(details.referenceId, dateYYYYMMDD, 'h')
        return {
          hourly,
          hourlyCurveStationId: details.referenceId,
          usedReferenceFallback: true,
        }
      } catch {
        return {
          hourly: [],
          hourlyCurveStationId: stationId,
          usedReferenceFallback: false,
          warning: 'Tide hourly curve unavailable (reference station also failed)',
        }
      }
    }
    return {
      hourly: [],
      hourlyCurveStationId: stationId,
      usedReferenceFallback: false,
      warning: 'Tide hourly curve unavailable',
    }
  }
}
