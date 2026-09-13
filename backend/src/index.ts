import { createApp } from './app.js'

const port = process.env.PORT ? Number(process.env.PORT) : 3001

createApp().listen(port, () => {
  console.log(`CastLine backend listening on http://localhost:${port}`)
})
