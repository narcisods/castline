export type TideEventType = 'high' | 'low'
export type PressureTrend = 'rising' | 'falling' | 'steady'

export interface TideEvent {
  time: string // local ISO, e.g. "2026-09-13T06:42:00"
  heightFt: number
  type: TideEventType
}

export interface HourlyConditions {
  time: string // local ISO hour, e.g. "2026-09-13T12:00:00"
  tideHeightFt: number | null
  waveHeightFt: number | null
  wavePeriodSec: number | null
  waveDirectionDeg: number | null
  swellHeightFt: number | null
  swellPeriodSec: number | null
  swellDirectionDeg: number | null
  wavePowerKw: number | null // deep-water wave power flux, kW per meter of crest, from the swell component
  windSpeedMph: number | null
  windDirectionDeg: number | null
  pressureHpa: number | null
  pressureTrend: PressureTrend | null
  precipitationIn: number | null
}

export interface TideStationInfo {
  id: string
  name: string
  distanceMiles: number
  type: 'R' | 'S'
  hourlyCurveStationId: string
  usedReferenceFallback: boolean
}

export interface BeachConditions {
  lat: number
  lon: number
  date: string // YYYY-MM-DD, Pacific-local "today"
  tideStation: TideStationInfo | null
  tideEvents: TideEvent[]
  hourly: HourlyConditions[]
  warnings: string[]
}
