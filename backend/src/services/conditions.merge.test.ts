import { describe, expect, it } from 'vitest'
import { buildHourlyConditions, buildTideEvents } from './conditions.merge.js'
import type { MarineHourly } from './marine.js'
import type { WeatherHourly } from './weather.js'

const DATE = '2026-09-13'

describe('buildTideEvents', () => {
  it('maps NOAA hi/lo predictions to tide events', () => {
    const events = buildTideEvents([
      { t: '2026-09-13 00:39', v: '5.426', type: 'H' },
      { t: '2026-09-13 06:30', v: '1.228', type: 'L' },
    ])

    expect(events).toEqual([
      { time: '2026-09-13T00:39:00', heightFt: 5.426, type: 'high' },
      { time: '2026-09-13T06:30:00', heightFt: 1.228, type: 'low' },
    ])
  })

  it('drops events with an unparseable height rather than recording 0', () => {
    const events = buildTideEvents([{ t: '2026-09-13 00:39', v: '', type: 'H' }])
    expect(events).toEqual([])
  })

  it('returns an empty array for empty input', () => {
    expect(buildTideEvents([])).toEqual([])
  })
})

describe('buildHourlyConditions', () => {
  it('maps aligned tide/marine/weather rows for the happy path', () => {
    const { hourly, warnings } = buildHourlyConditions({
      date: DATE,
      tideHourly: [{ t: '2026-09-13 12:00', v: '4.2' }],
      marine: {
        time: ['2026-09-13T12:00'],
        wave_height: [3.1],
        wave_period: [9],
        wave_direction: [270],
        swell_wave_height: [2],
        swell_wave_period: [11],
        swell_wave_direction: [280],
      },
      weather: {
        time: ['2026-09-13T12:00'],
        wind_speed_10m: [10],
        wind_direction_10m: [300],
        surface_pressure: [1015],
        precipitation: [0],
      },
    })

    expect(warnings).toEqual([])
    expect(hourly).toEqual([
      {
        time: '2026-09-13T12:00:00',
        tideHeightFt: 4.2,
        waveHeightFt: 3.1,
        wavePeriodSec: 9,
        waveDirectionDeg: 270,
        swellHeightFt: 2,
        swellPeriodSec: 11,
        swellDirectionDeg: 280,
        windSpeedMph: 10,
        windDirectionDeg: 300,
        pressureHpa: 1015,
        pressureTrend: null, // no prior hour to compare
        precipitationIn: 0,
      },
    ])
  })

  it('fills nulls for a source missing an hour instead of dropping the row', () => {
    const { hourly } = buildHourlyConditions({
      date: DATE,
      tideHourly: [],
      marine: {
        time: ['2026-09-13T12:00', '2026-09-13T13:00'],
        wave_height: [3.1, 3.3],
      },
      weather: {
        time: ['2026-09-13T12:00'], // missing the 13:00 hour
        wind_speed_10m: [10],
      },
    })

    expect(hourly).toHaveLength(2)
    expect(hourly[0].windSpeedMph).toBe(10)
    expect(hourly[1].windSpeedMph).toBeNull() // missing hour -> null, row still present
    expect(hourly[1].waveHeightFt).toBe(3.3)
  })

  it('passes through a null in the middle of a source array without coercing it', () => {
    const { hourly } = buildHourlyConditions({
      date: DATE,
      tideHourly: [],
      marine: {
        time: ['2026-09-13T12:00', '2026-09-13T13:00', '2026-09-13T14:00'],
        wave_height: [3.1, null, 3.5],
      },
      weather: null,
    })

    expect(hourly[1].waveHeightFt).toBeNull()
  })

  it('excludes a tide-curve entry for a different day (day-boundary artifact)', () => {
    const { hourly } = buildHourlyConditions({
      date: DATE,
      tideHourly: [
        { t: '2026-09-13 23:00', v: '3.0' },
        { t: '2026-09-14 00:00', v: '3.1' }, // NOAA's next-day boundary point
      ],
      marine: null,
      weather: null,
    })

    expect(hourly).toHaveLength(1)
    expect(hourly[0].time).toBe('2026-09-13T23:00:00')
  })

  it('warns but does not throw when all sources are empty', () => {
    const { hourly, warnings } = buildHourlyConditions({
      date: DATE,
      tideHourly: [],
      marine: null,
      weather: null,
    })

    expect(hourly).toEqual([])
    expect(warnings).toEqual([
      'Tide hourly curve unavailable',
      'Marine (wave/swell) data unavailable',
      'Weather (wind/pressure/precipitation) data unavailable',
    ])
  })

  it('handles a 23-hour input (spring-forward DST day) without crashing', () => {
    const time = Array.from({ length: 23 }, (_, i) => `2026-03-08T${String(i).padStart(2, '0')}:00`)
    const weather: WeatherHourly = { time, wind_speed_10m: time.map(() => 5) }
    const { hourly } = buildHourlyConditions({ date: '2026-03-08', tideHourly: [], marine: null, weather })
    expect(hourly).toHaveLength(23)
  })

  it('handles a 25-hour input (fall-back DST day) without crashing', () => {
    const time = Array.from({ length: 25 }, (_, i) => `2026-11-01T${String(i % 24).padStart(2, '0')}:00`)
    const marine: MarineHourly = { time, wave_height: time.map(() => 2) }
    const { hourly } = buildHourlyConditions({ date: '2026-11-01', tideHourly: [], marine, weather: null })
    expect(hourly.length).toBeGreaterThanOrEqual(24)
  })

  describe('pressure trend', () => {
    function hourlyWithPressures(pressures: number[]) {
      const time = pressures.map((_, i) => `2026-09-13T${String(i).padStart(2, '0')}:00`)
      const weather: WeatherHourly = { time, surface_pressure: pressures }
      return buildHourlyConditions({ date: DATE, tideHourly: [], marine: null, weather }).hourly
    }

    it('is null for the first hour (no prior hour to compare)', () => {
      const hourly = hourlyWithPressures([1015, 1016])
      expect(hourly[0].pressureTrend).toBeNull()
    })

    it('is steady when the change is exactly at the threshold', () => {
      const hourly = hourlyWithPressures([1015, 1016]) // delta = 1, threshold = 1
      expect(hourly[1].pressureTrend).toBe('steady')
    })

    it('is rising when the change exceeds the threshold upward', () => {
      const hourly = hourlyWithPressures([1015, 1016.1])
      expect(hourly[1].pressureTrend).toBe('rising')
    })

    it('is falling when the change exceeds the threshold downward', () => {
      const hourly = hourlyWithPressures([1015, 1013.9])
      expect(hourly[1].pressureTrend).toBe('falling')
    })
  })
})
