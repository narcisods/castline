import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPacificTodayDate, normalizeHourKey, pacificTodayAsNoaaDate } from './date.js'

describe('getPacificTodayDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the Pacific calendar date, not the UTC one, when they differ', () => {
    // Wednesday 03:00 UTC = Tuesday 20:00 PDT (UTC-7 in September)
    vi.setSystemTime(new Date('2026-09-16T03:00:00Z'))
    expect(getPacificTodayDate()).toBe('2026-09-15')
  })

  it('matches the UTC date when both agree', () => {
    // Wednesday 20:00 UTC = Wednesday 13:00 PDT
    vi.setSystemTime(new Date('2026-09-16T20:00:00Z'))
    expect(getPacificTodayDate()).toBe('2026-09-16')
  })
})

describe('pacificTodayAsNoaaDate', () => {
  it('strips dashes from the Pacific date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T03:00:00Z'))
    expect(pacificTodayAsNoaaDate()).toBe('20260915')
    vi.useRealTimers()
  })
})

describe('normalizeHourKey', () => {
  it('buckets NOAA-style ("space" separator) timestamps', () => {
    expect(normalizeHourKey('2026-09-13 14:00')).toBe('2026-09-13T14:00')
  })

  it('buckets Open-Meteo-style ("T" separator) timestamps', () => {
    expect(normalizeHourKey('2026-09-13T14:00')).toBe('2026-09-13T14:00')
  })

  it('produces the same key for both formats at the same hour', () => {
    expect(normalizeHourKey('2026-09-13 14:32')).toBe(normalizeHourKey('2026-09-13T14:47'))
  })
})
