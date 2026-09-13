import { Router } from 'express'
import { geocodeWithFallback } from '../services/geocode.js'

export const geocodeRouter = Router()

geocodeRouter.get('/geocode', async (req, res) => {
  const { name, city, state } = req.query
  if (typeof name !== 'string' || typeof city !== 'string' || typeof state !== 'string') {
    res.status(400).json({ error: 'name, city, and state query params are required' })
    return
  }

  try {
    const found = await geocodeWithFallback(name, city, state)
    if (!found) {
      res.status(404).json({ error: `No location found for "${name}, ${city}, ${state}"` })
      return
    }
    res.json(found)
  } catch (err) {
    res.status(502).json({ error: `Geocoding service unavailable: ${(err as Error).message}` })
  }
})
