import { Router } from 'express'
import { getBeachConditions } from '../services/conditions.js'

export const conditionsRouter = Router()

// Generous California coastline bounding box - just a sanity check on input,
// not a strict service boundary.
const LAT_RANGE = [32, 42] as const
const LON_RANGE = [-125, -114] as const

function parseCoordinate(value: unknown, range: readonly [number, number]): number | null {
  if (typeof value !== 'string') return null
  const n = Number(value)
  if (Number.isNaN(n) || n < range[0] || n > range[1]) return null
  return n
}

conditionsRouter.get('/conditions', async (req, res) => {
  const lat = parseCoordinate(req.query.lat, LAT_RANGE)
  const lon = parseCoordinate(req.query.lon, LON_RANGE)

  if (lat === null || lon === null) {
    res.status(400).json({ error: 'lat and lon query params are required and must be within the CA coastline range' })
    return
  }

  try {
    const conditions = await getBeachConditions(lat, lon)
    res.json(conditions)
  } catch (err) {
    res.status(502).json({ error: `Conditions service unavailable: ${(err as Error).message}` })
  }
})
