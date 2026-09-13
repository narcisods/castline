import { spikeBeaches } from './beaches.js'
import { geocodeWithFallback } from './nominatim.js'
import { findNearestTideStation, fetchTidePredictions, getStationDetails } from './noaa.js'
import { fetchMarineForecast, fetchWeatherForecast } from './open-meteo.js'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function todayYYYYMMDD(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

async function run() {
  const today = todayYYYYMMDD()

  for (const beach of spikeBeaches) {
    console.log('\n' + '='.repeat(70))
    console.log(beach.name)
    console.log('='.repeat(70))

    // 1. Geocode (with state-only fallback if the full "name, city, state" query misses)
    const geocoded = await geocodeWithFallback(beach.name, beach.city, beach.state)
    if (!geocoded) {
      console.log(`  GEOCODE: no result for "${beach.name}, ${beach.city}, ${beach.state}"`)
      continue
    }
    const geo = geocoded.result
    console.log(`  GEOCODE (query: "${geocoded.queryUsed}") -> ${geo.lat}, ${geo.lon} (${geo.displayName})`)
    await sleep(1100) // respect Nominatim's ~1 req/sec usage policy

    // 2. Nearest NOAA tide station
    const { station, distanceMiles } = await findNearestTideStation(geo.lat, geo.lon)
    console.log(
      `  NOAA STATION -> ${station.id} "${station.name}" (${distanceMiles.toFixed(1)} mi away)`,
    )

    // 3. Tide predictions: hi/lo (from nearest station) + hourly curve
    try {
      const details = await getStationDetails(station.id)
      console.log(`  NOAA STATION TYPE -> ${details.type === 'R' ? 'Reference' : 'Subordinate'}` +
        (details.referenceId ? ` (reference station: ${details.referenceId})` : ''))

      const hilo = await fetchTidePredictions(station.id, today, 'hilo')
      console.log(`  TIDE HI/LO (${hilo.length} events, from station ${station.id}):`)
      for (const p of hilo) {
        console.log(`    ${p.t}  ${p.v}ft  ${p.type === 'H' ? 'HIGH' : 'LOW'}`)
      }

      // Subordinate stations only support hi/lo (offset-based) predictions, not a full
      // hourly curve at a fixed datum — fall back to the reference station for that.
      const hourlyStationId =
        details.type === 'S' && details.referenceId ? details.referenceId : station.id
      const hourly = await fetchTidePredictions(hourlyStationId, today, 'h')
      console.log(
        `  TIDE HOURLY CURVE: ${hourly.length} points (from station ${hourlyStationId}` +
          (hourlyStationId !== station.id ? ', fell back to reference station' : '') +
          ')',
      )
      console.log(`    first: ${JSON.stringify(hourly[0])}`)
      console.log(`    last:  ${JSON.stringify(hourly[hourly.length - 1])}`)
    } catch (err) {
      console.log(`  TIDE ERROR: ${(err as Error).message}`)
    }

    // 4. Marine (wave/swell)
    try {
      const marine = await fetchMarineForecast(geo.lat, geo.lon)
      const hoursWithData = marine.wave_height?.filter((v) => v !== null).length ?? 0
      console.log(
        `  MARINE -> ${marine.time.length} hourly points, ${hoursWithData} with wave_height data`,
      )
      console.log(`    sample @${marine.time[12]}: wave_height=${marine.wave_height?.[12]}m ` +
        `wave_period=${marine.wave_period?.[12]}s wave_dir=${marine.wave_direction?.[12]}deg ` +
        `swell_height=${marine.swell_wave_height?.[12]}m swell_period=${marine.swell_wave_period?.[12]}s`)
    } catch (err) {
      console.log(`  MARINE ERROR: ${(err as Error).message}`)
    }

    // 5. Weather (wind, pressure, precip)
    try {
      const weather = await fetchWeatherForecast(geo.lat, geo.lon)
      console.log(`  WEATHER -> ${weather.time.length} hourly points`)
      console.log(`    sample @${weather.time[12]}: wind=${weather.wind_speed_10m?.[12]}km/h ` +
        `dir=${weather.wind_direction_10m?.[12]}deg pressure=${weather.surface_pressure?.[12]}hPa ` +
        `precip=${weather.precipitation?.[12]}mm`)
    } catch (err) {
      console.log(`  WEATHER ERROR: ${(err as Error).message}`)
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
