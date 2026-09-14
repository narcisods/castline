import cors from 'cors'
import express from 'express'
import { conditionsRouter } from './routes/conditions.js'
import { geocodeRouter } from './routes/geocode.js'

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

export function createApp() {
  const app = express()

  app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', geocodeRouter)
  app.use('/api', conditionsRouter)

  return app
}
