import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildSmoothPath,
  formatClockTime,
  getPacificNowMinutes,
  getPacificToday,
  niceTicks,
  timeToMinutesOfDay,
} from './tideChart'

describe('timeToMinutesOfDay', () => {
  it('extracts minutes-since-midnight from a local ISO timestamp', () => {
    expect(timeToMinutesOfDay('2026-09-13T14:30:00')).toBe(14 * 60 + 30)
    expect(timeToMinutesOfDay('2026-09-13T00:00:00')).toBe(0)
    expect(timeToMinutesOfDay('2026-09-13T23:59:00')).toBe(23 * 60 + 59)
  })
})

describe('buildSmoothPath', () => {
  it('returns empty string for no points', () => {
    expect(buildSmoothPath([])).toBe('')
  })

  it('returns a single moveto for one point', () => {
    expect(buildSmoothPath([{ x: 5, y: 10 }])).toBe('M 5 10')
  })

  it('produces a path that starts at the first point and has a segment per gap', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 2 },
    ]
    const path = buildSmoothPath(points)
    expect(path.startsWith('M 0 0')).toBe(true)
    expect(path.match(/C /g)).toHaveLength(2) // one cubic segment per adjacent pair
  })
})

describe('niceTicks', () => {
  it('returns the single value when min equals max', () => {
    expect(niceTicks(3, 3, 4)).toEqual([3])
  })

  it('produces evenly spaced round ticks spanning the range', () => {
    const ticks = niceTicks(0.5, 5.8, 4)
    expect(ticks[0]).toBeLessThanOrEqual(0.5)
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(5.8)
    // evenly spaced
    const step = ticks[1] - ticks[0]
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step, 5)
    }
  })
})

describe('formatClockTime', () => {
  it('formats midnight, noon, and afternoon correctly', () => {
    expect(formatClockTime(0)).toBe('12:00am')
    expect(formatClockTime(12 * 60)).toBe('12:00pm')
    expect(formatClockTime(13 * 60 + 5)).toBe('1:05pm')
    expect(formatClockTime(23 * 60 + 59)).toBe('11:59pm')
  })
})

describe('getPacificNowMinutes / getPacificToday', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads Pacific time, not the system/browser local time', () => {
    vi.useFakeTimers()
    // Wednesday 03:00 UTC = Tuesday 20:00 PDT (UTC-7 in September)
    vi.setSystemTime(new Date('2026-09-16T03:00:00Z'))
    expect(getPacificNowMinutes()).toBe(20 * 60)
    expect(getPacificToday()).toBe('2026-09-15')
  })
})
