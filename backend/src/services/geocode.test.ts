import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeWithFallback } from './geocode.js'

function mockNominatimResponse(results: Array<{ lat: string; lon: string; display_name: string }>) {
  return { ok: true, json: async () => results } as Response
}

describe('geocodeWithFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the full query result without falling back when it hits', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockNominatimResponse([{ lat: '37.75', lon: '-122.5', display_name: 'Ocean Beach' }]))
    vi.stubGlobal('fetch', fetchMock)
    const sleepFn = vi.fn().mockResolvedValue(undefined)

    const result = await geocodeWithFallback('Ocean Beach', 'San Francisco', 'CA', sleepFn)

    expect(result?.queryUsed).toBe('Ocean Beach, San Francisco, CA')
    expect(fetchMock).toHaveBeenCalledTimes(1) // state-only fallback never called
    expect(sleepFn).not.toHaveBeenCalled()
  })

  it('falls back to a state-only query when the full query misses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockNominatimResponse([]))
      .mockResolvedValueOnce(
        mockNominatimResponse([{ lat: '36.93', lon: '-121.86', display_name: 'Manresa State Beach' }]),
      )
    vi.stubGlobal('fetch', fetchMock)
    const sleepFn = vi.fn().mockResolvedValue(undefined)

    const result = await geocodeWithFallback('Manresa State Beach', 'Watsonville', 'CA', sleepFn)

    expect(result?.queryUsed).toBe('Manresa State Beach, CA')
    const secondCallUrl = fetchMock.mock.calls[1][0] as URL
    expect(secondCallUrl.searchParams.get('q')).toBe('Manresa State Beach, CA')
    expect(sleepFn).toHaveBeenCalledTimes(1)
  })

  it('resolves to null when both the full and state-only queries miss', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockNominatimResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const sleepFn = vi.fn().mockResolvedValue(undefined)

    const result = await geocodeWithFallback('Nowhere Beach', 'Nowhere', 'CA', sleepFn)

    expect(result).toBeNull()
  })

  it('sends a User-Agent header identifying the app', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockNominatimResponse([{ lat: '1', lon: '2', display_name: 'x' }]))
    vi.stubGlobal('fetch', fetchMock)

    await geocodeWithFallback('Ocean Beach', 'San Francisco', 'CA', vi.fn())

    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect((options.headers as Record<string, string>)['User-Agent']).toMatch(/CastLine/)
  })
})
