import { normalizeHourKey } from '../utils/date.js'
import { parseNoaaNumber, type RawTidePrediction } from './noaaTides.js'
import type { MarineHourly } from './marine.js'
import type { WeatherHourly } from './weather.js'
import type { HourlyConditions, PressureTrend, TideEvent } from '../types/conditions.js'

const PRESSURE_TREND_THRESHOLD_HPA = 1

function toIsoSeconds(rawTimestamp: string): string {
  const withT = rawTimestamp.replace(' ', 'T')
  return withT.length === 16 ? `${withT}:00` : withT // "...THH:mm" -> "...THH:mm:00"
}

export function buildTideEvents(hilo: RawTidePrediction[]): TideEvent[] {
  const events: TideEvent[] = []
  for (const p of hilo) {
    const heightFt = parseNoaaNumber(p.v)
    if (heightFt === null) continue
    events.push({
      time: toIsoSeconds(p.t),
      heightFt,
      type: p.type === 'H' ? 'high' : 'low',
    })
  }
  return events
}

interface BuildHourlyConditionsInput {
  date: string // YYYY-MM-DD, rows outside this date are excluded
  tideHourly: RawTidePrediction[]
  marine: MarineHourly | null
  weather: WeatherHourly | null
}

interface BuildHourlyConditionsResult {
  hourly: HourlyConditions[]
  warnings: string[]
}

function pressureTrend(current: number | null, previous: number | null): PressureTrend | null {
  if (current === null || previous === null) return null
  const delta = current - previous
  if (delta > PRESSURE_TREND_THRESHOLD_HPA) return 'rising'
  if (delta < -PRESSURE_TREND_THRESHOLD_HPA) return 'falling'
  return 'steady'
}

export function buildHourlyConditions(input: BuildHourlyConditionsInput): BuildHourlyConditionsResult {
  const warnings: string[] = []

  type Row = Omit<HourlyConditions, 'pressureTrend'>
  const rows = new Map<string, Row>()

  function emptyRow(hourKey: string): Row {
    return {
      time: `${hourKey}:00`,
      tideHeightFt: null,
      waveHeightFt: null,
      wavePeriodSec: null,
      waveDirectionDeg: null,
      swellHeightFt: null,
      swellPeriodSec: null,
      swellDirectionDeg: null,
      windSpeedMph: null,
      windDirectionDeg: null,
      pressureHpa: null,
      precipitationIn: null,
    }
  }

  function getRow(rawTime: string): Row | null {
    const hourKey = normalizeHourKey(rawTime)
    if (!hourKey.startsWith(input.date)) return null // exclude other-day boundary points
    let row = rows.get(hourKey)
    if (!row) {
      row = emptyRow(hourKey)
      rows.set(hourKey, row)
    }
    return row
  }

  if (input.tideHourly.length === 0) {
    warnings.push('Tide hourly curve unavailable')
  }
  for (const p of input.tideHourly) {
    const row = getRow(p.t)
    if (row) row.tideHeightFt = parseNoaaNumber(p.v)
  }

  if (!input.marine || input.marine.time.length === 0) {
    warnings.push('Marine (wave/swell) data unavailable')
  } else {
    input.marine.time.forEach((t, i) => {
      const row = getRow(t)
      if (!row) return
      row.waveHeightFt = input.marine?.wave_height?.[i] ?? null
      row.wavePeriodSec = input.marine?.wave_period?.[i] ?? null
      row.waveDirectionDeg = input.marine?.wave_direction?.[i] ?? null
      row.swellHeightFt = input.marine?.swell_wave_height?.[i] ?? null
      row.swellPeriodSec = input.marine?.swell_wave_period?.[i] ?? null
      row.swellDirectionDeg = input.marine?.swell_wave_direction?.[i] ?? null
    })
  }

  if (!input.weather || input.weather.time.length === 0) {
    warnings.push('Weather (wind/pressure/precipitation) data unavailable')
  } else {
    input.weather.time.forEach((t, i) => {
      const row = getRow(t)
      if (!row) return
      row.windSpeedMph = input.weather?.wind_speed_10m?.[i] ?? null
      row.windDirectionDeg = input.weather?.wind_direction_10m?.[i] ?? null
      row.pressureHpa = input.weather?.surface_pressure?.[i] ?? null
      row.precipitationIn = input.weather?.precipitation?.[i] ?? null
    })
  }

  const sortedRows = [...rows.values()].sort((a, b) => a.time.localeCompare(b.time))

  const hourly: HourlyConditions[] = sortedRows.map((row, i) => ({
    ...row,
    pressureTrend: pressureTrend(row.pressureHpa, sortedRows[i - 1]?.pressureHpa ?? null),
  }))

  return { hourly, warnings }
}
