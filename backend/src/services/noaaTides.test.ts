import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseNoaaNumber, resolveHourlyTideCurve, type NoaaStationDetails } from './noaaTides.js'

describe('parseNoaaNumber', () => {
  it('parses a normal numeric string', () => {
    expect(parseNoaaNumber('4.2')).toBe(4.2)
  })

  it('treats an empty string as null, not 0', () => {
    expect(parseNoaaNumber('')).toBeNull()
  })

  it('treats a whitespace-only string as null', () => {
    expect(parseNoaaNumber('   ')).toBeNull()
  })

  it('treats a non-numeric string as null', () => {
    expect(parseNoaaNumber('abc')).toBeNull()
  })
})

function mockPredictionsResponse(predictions: Array<{ t: string; v: string; type?: string }>) {
  return {
    ok: true,
    json: async () => ({ predictions }),
  } as Response
}

function mockNoaaError(message: string) {
  return {
    ok: false,
    status: 400,
    json: async () => ({ error: { message } }),
  } as Response
}

describe('resolveHourlyTideCurve', () => {
  const subordinateWithRef: NoaaStationDetails = {
    id: '9414275',
    name: 'Ocean Beach, outer coast',
    type: 'S',
    referenceId: '9414290',
  }
  const subordinateNoRef: NoaaStationDetails = {
    id: '9414131',
    name: 'Pillar Point Harbor',
    type: 'S',
  }
  const reference: NoaaStationDetails = {
    id: '9414290',
    name: 'San Francisco',
    type: 'R',
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the direct hourly result when the station is subordinate but serves interval=h fine', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockPredictionsResponse([{ t: '2026-09-13 00:00', v: '4.5' }]))
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveHourlyTideCurve('9414275', subordinateWithRef, '20260913')

    expect(result.usedReferenceFallback).toBe(false)
    expect(result.hourlyCurveStationId).toBe('9414275')
    expect(result.hourly).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // fallback must NOT fire when direct succeeds
  })

  it('falls back to the reference station when the direct hourly request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockNoaaError('No Predictions data was found.'))
      .mockResolvedValueOnce(mockPredictionsResponse([{ t: '2026-09-13 00:00', v: '4.7' }]))
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveHourlyTideCurve('9414275', subordinateWithRef, '20260913')

    expect(result.usedReferenceFallback).toBe(true)
    expect(result.hourlyCurveStationId).toBe('9414290')
    expect(result.hourly).toHaveLength(1)
    expect(result.warning).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0].toString()).toContain('station=9414290')
  })

  it('degrades without throwing when subordinate with no reference id fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockNoaaError('No Predictions data was found.'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveHourlyTideCurve('9414131', subordinateNoRef, '20260913')

    expect(result.usedReferenceFallback).toBe(false)
    expect(result.hourly).toEqual([])
    expect(result.warning).toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(1) // no fallback attempted - nothing to fall back to
  })

  it('degrades without throwing when a reference station itself fails direct hourly', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockNoaaError('No Predictions data was found.'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveHourlyTideCurve('9414290', reference, '20260913')

    expect(result.usedReferenceFallback).toBe(false)
    expect(result.hourly).toEqual([])
    expect(result.warning).toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('degrades without throwing when both the direct and fallback reference requests fail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockNoaaError('No Predictions data was found.'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveHourlyTideCurve('9414275', subordinateWithRef, '20260913')

    expect(result.usedReferenceFallback).toBe(false)
    expect(result.hourly).toEqual([])
    expect(result.warning).toContain('reference station also failed')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
