import express from 'express'
import { conditionsRouter } from './routes/conditions.js'
import { geocodeRouter } from './routes/geocode.js'

export function createApp() {
  const app = express()

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', geocodeRouter)
  app.use('/api', conditionsRouter)

  return app
}
