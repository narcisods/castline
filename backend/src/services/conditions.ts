import { getPacificTodayDate, pacificTodayAsNoaaDate } from '../utils/date.js'
import type { BeachConditions, TideStationInfo } from '../types/conditions.js'
import {
  fetchTidePredictions,
  findNearestTideStation,
  getStationDetails,
  resolveHourlyTideCurve,
  type NoaaStationDetails,
} from './noaaTides.js'
import { fetchMarineForecast, type MarineHourly } from './marine.js'
import { fetchWeatherForecast, type WeatherHourly } from './weather.js'
import { buildHourlyConditions, buildTideEvents } from './conditions.merge.js'

/**
 * Fetches and normalizes today's tide/weather/wave conditions for a single
 * point. Takes only coordinates (no beach identity) so V2's "fetch all
 * beaches at once for AI ranking" can reuse this unchanged.
 *
 * Only a totally unreachable NOAA station list is treated as fatal (everything
 * tide-related needs a station) - every other upstream failure degrades to
 * nulls + a warning rather than throwing, since a personal tool showing
 * "wind data unavailable" is more useful than a hard error when two of three
 * sources are fine.
 */
export async function getBeachConditions(lat: number, lon: number): Promise<BeachConditions> {
  const date = getPacificTodayDate()
  const noaaDate = pacificTodayAsNoaaDate()
  const warnings: string[] = []

  const marinePromise: Promise<MarineHourly | null> = fetchMarineForecast(lat, lon).catch(
    () => null,
  )
  const weatherPromise: Promise<WeatherHourly | null> = fetchWeatherForecast(lat, lon).catch(
    () => null,
  )

  // Fatal: everything tide-related depends on knowing the station.
  const station = await findNearestTideStation(lat, lon)

  const details: NoaaStationDetails = await getStationDetails(station.id).catch(() => {
    warnings.push('Tide station details unavailable')
    return { id: station.id, name: station.name, type: 'unknown' } satisfies NoaaStationDetails
  })

  const [hiloSettled, hourlyCurveSettled] = await Promise.allSettled([
    fetchTidePredictions(station.id, noaaDate, 'hilo'),
    resolveHourlyTideCurve(station.id, details, noaaDate),
  ])

  const hilo = hiloSettled.status === 'fulfilled' ? hiloSettled.value : []
  if (hiloSettled.status === 'rejected') {
    warnings.push('Tide high/low times unavailable')
  }

  const hourlyCurve =
    hourlyCurveSettled.status === 'fulfilled'
      ? hourlyCurveSettled.value
      : {
          hourly: [],
          hourlyCurveStationId: station.id,
          usedReferenceFallback: false,
          warning: 'Tide hourly curve unavailable',
        }
  if (hourlyCurve.warning) warnings.push(hourlyCurve.warning)

  const [marine, weather] = await Promise.all([marinePromise, weatherPromise])
  if (!marine) warnings.push('Marine (wave/swell) data unavailable')
  if (!weather) warnings.push('Weather (wind/pressure/precipitation) data unavailable')

  const tideEvents = buildTideEvents(hilo)
  const { hourly, warnings: mergeWarnings } = buildHourlyConditions({
    date,
    tideHourly: hourlyCurve.hourly,
    marine,
    weather,
  })

  const tideStation: TideStationInfo = {
    id: station.id,
    name: station.name,
    distanceMiles: station.distanceMiles,
    type: details.type === 'R' ? 'R' : 'S',
    hourlyCurveStationId: hourlyCurve.hourlyCurveStationId,
    usedReferenceFallback: hourlyCurve.usedReferenceFallback,
  }

  return {
    lat,
    lon,
    date,
    tideStation,
    tideEvents,
    hourly,
    warnings: dedupe([...warnings, ...mergeWarnings]),
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}
