import { geocodeWithFallback, type Viewbox } from '../src/services/geocode.js'

// Northern California coast, San Francisco to Marina - keeps fallback queries
// from matching a same-named place in a different state/country (seen with
// "Blacks Beach" -> San Diego and "China Beach" -> Vancouver Island).
const NORCAL_COAST_VIEWBOX: Viewbox = [-122.75, 37.85, -121.6, 36.6]

interface BeachInput {
  name: string
  city: string
  state: string
}

const beaches: BeachInput[] = [
  { name: 'Baker Beach', city: 'San Francisco', state: 'CA' },
  { name: 'Ocean Beach', city: 'San Francisco', state: 'CA' },
  { name: 'Fort Funston', city: 'San Francisco', state: 'CA' },
  { name: 'Sharp Park Beach', city: 'Pacifica', state: 'CA' },
  { name: 'Rockaway Beach', city: 'Pacifica', state: 'CA' },
  { name: 'Linda Mar Beach', city: 'Pacifica', state: 'CA' },
  { name: 'Devils Slide Beach', city: 'Pacifica', state: 'CA' },
  { name: 'Montara State Beach', city: 'Montara', state: 'CA' },
  { name: 'Miramar Beach', city: 'Half Moon Bay', state: 'CA' },
  { name: 'Dunes Beach', city: 'Half Moon Bay', state: 'CA' },
  { name: 'Francis Beach', city: 'Half Moon Bay', state: 'CA' },
  { name: 'Poplar Beach', city: 'Half Moon Bay', state: 'CA' },
  { name: 'San Gregorio State Beach', city: 'Half Moon Bay', state: 'CA' },
  { name: 'Pomponio State Beach', city: 'San Gregorio', state: 'CA' },
  { name: 'Pescadero State Beach', city: 'Pescadero', state: 'CA' },
  { name: 'Cowell Beach', city: 'Santa Cruz', state: 'CA' },
  { name: 'Santa Cruz Beach', city: 'Santa Cruz', state: 'CA' },
  { name: 'Seabright Beach', city: 'Santa Cruz', state: 'CA' },
  { name: 'Twin Lakes State Beach', city: 'Santa Cruz', state: 'CA' },
  { name: "Black's Beach", city: 'Santa Cruz', state: 'CA' },
  { name: 'Capitola Beach', city: 'Capitola', state: 'CA' },
  { name: 'New Brighton State Beach', city: 'Capitola', state: 'CA' },
  { name: 'Seacliff State Beach', city: 'Aptos', state: 'CA' },
  { name: 'Rio Del Mar Beach', city: 'Rio Del Mar', state: 'CA' },
  { name: 'Hidden Beach', city: 'Rio Del Mar', state: 'CA' },
  { name: 'Seascape Beach', city: 'Rio Del Mar', state: 'CA' },
  { name: 'Manresa State Beach', city: 'Watsonville', state: 'CA' },
  { name: 'Sunset State Beach', city: 'Watsonville', state: 'CA' },
  { name: 'Palm Beach', city: 'Watsonville', state: 'CA' },
  { name: 'Moss Landing State Beach', city: 'Moss Landing', state: 'CA' },
  { name: 'Marina State Beach', city: 'Marina', state: 'CA' },
]

async function run() {
  const results: Array<{
    id: string
    name: string
    city: string
    state: string
    lat: number
    lon: number
    queryUsed: string
    displayName: string
  }> = []
  const failures: BeachInput[] = []

  for (const beach of beaches) {
    const found = await geocodeWithFallback(
      beach.name,
      beach.city,
      beach.state,
      undefined,
      NORCAL_COAST_VIEWBOX,
    )
    if (!found) {
      console.error(`MISS: ${beach.name}, ${beach.city}, ${beach.state}`)
      failures.push(beach)
      continue
    }
    const flagFallback = found.queryUsed !== `${beach.name}, ${beach.city}, ${beach.state}`
    console.error(
      `${flagFallback ? 'FALLBACK' : 'OK'}: ${beach.name} -> (${found.result.lat}, ${found.result.lon}) ${found.result.displayName}`,
    )
    results.push({
      id: crypto.randomUUID(),
      name: beach.name,
      city: beach.city,
      state: beach.state,
      lat: found.result.lat,
      lon: found.result.lon,
      queryUsed: found.queryUsed,
      displayName: found.result.displayName,
    })
    await new Promise((resolve) => setTimeout(resolve, 1100))
  }

  console.error(`\n${results.length}/${beaches.length} geocoded, ${failures.length} failed`)
  console.log(JSON.stringify(results, null, 2))
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
