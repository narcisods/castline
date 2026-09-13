import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

const { getBeachConditionsMock } = vi.hoisted(() => ({ getBeachConditionsMock: vi.fn() }))
vi.mock('../services/conditions.js', () => ({ getBeachConditions: getBeachConditionsMock }))

const { createApp } = await import('../app.js')

describe('GET /api/conditions', () => {
  it('returns 400 when lat/lon are missing', async () => {
    const res = await request(createApp()).get('/api/conditions')
    expect(res.status).toBe(400)
    expect(getBeachConditionsMock).not.toHaveBeenCalled()
  })

  it('returns 400 when lat/lon are outside the CA coastline range', async () => {
    const res = await request(createApp()).get('/api/conditions?lat=0&lon=0')
    expect(res.status).toBe(400)
  })

  it('returns 502 when the conditions service throws (fatal path)', async () => {
    getBeachConditionsMock.mockRejectedValueOnce(new Error('No NOAA tide stations found'))
    const res = await request(createApp()).get('/api/conditions?lat=37.75&lon=-122.5')
    expect(res.status).toBe(502)
  })

  it('returns 200 with the conditions payload on success', async () => {
    const payload = { lat: 37.75, lon: -122.5, date: '2026-09-13', hourly: [], tideEvents: [], warnings: [] }
    getBeachConditionsMock.mockResolvedValueOnce(payload)
    const res = await request(createApp()).get('/api/conditions?lat=37.75&lon=-122.5')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(payload)
  })
})
