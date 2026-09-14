import { createApp } from './app.js'

try {
  process.loadEnvFile()
} catch {
  // no .env file present - fine in production where env vars are injected directly
}

const port = process.env.PORT ? Number(process.env.PORT) : 3001

createApp().listen(port, () => {
  console.log(`CastLine backend listening on http://localhost:${port}`)
})
