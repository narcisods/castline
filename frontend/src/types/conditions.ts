export type TideEventType = 'high' | 'low'
export type PressureTrend = 'rising' | 'falling' | 'steady'

export interface TideEvent {
  time: string
  heightFt: number
  type: TideEventType
}

export interface HourlyConditions {
  time: string
  tideHeightFt: number | null
  waveHeightFt: number | null
  wavePeriodSec: number | null
  waveDirectionDeg: number | null
  swellHeightFt: number | null
  swellPeriodSec: number | null
  swellDirectionDeg: number | null
  wavePowerKw: number | null
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
  date: string
  tideStation: TideStationInfo | null
  tideEvents: TideEvent[]
  hourly: HourlyConditions[]
  warnings: string[]
}
