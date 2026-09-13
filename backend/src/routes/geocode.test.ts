import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

const { geocodeWithFallbackMock } = vi.hoisted(() => ({ geocodeWithFallbackMock: vi.fn() }))
vi.mock('../services/geocode.js', () => ({ geocodeWithFallback: geocodeWithFallbackMock }))

const { createApp } = await import('../app.js')

describe('GET /api/geocode', () => {
  it('returns 400 when required query params are missing', async () => {
    const res = await request(createApp()).get('/api/geocode?name=Ocean+Beach')
    expect(res.status).toBe(400)
    expect(geocodeWithFallbackMock).not.toHaveBeenCalled()
  })

  it('returns 404 when no location is found', async () => {
    geocodeWithFallbackMock.mockResolvedValueOnce(null)
    const res = await request(createApp()).get('/api/geocode?name=Nowhere&city=Nowhere&state=CA')
    expect(res.status).toBe(404)
  })

  it('returns 502 when the geocoding service is unreachable', async () => {
    geocodeWithFallbackMock.mockRejectedValueOnce(new Error('network error'))
    const res = await request(createApp()).get('/api/geocode?name=Ocean+Beach&city=San+Francisco&state=CA')
    expect(res.status).toBe(502)
  })

  it('returns 200 with the geocode result on success', async () => {
    const payload = { result: { lat: 37.75, lon: -122.5, displayName: 'Ocean Beach' }, queryUsed: 'Ocean Beach, San Francisco, CA' }
    geocodeWithFallbackMock.mockResolvedValueOnce(payload)
    const res = await request(createApp()).get('/api/geocode?name=Ocean+Beach&city=San+Francisco&state=CA')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(payload)
  })
})
