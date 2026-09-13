export interface MarineHourly {
  time: string[]
  wave_height?: number[]
  wave_period?: number[]
  wave_direction?: number[]
  swell_wave_height?: number[]
  swell_wave_period?: number[]
  swell_wave_direction?: number[]
}

export async function fetchMarineForecast(lat: number, lon: number): Promise<MarineHourly> {
  const url = new URL('https://marine-api.open-meteo.com/v1/marine')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'hourly',
    'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction',
  )
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo marine request failed: ${res.status}`)
  const data = (await res.json()) as { hourly: MarineHourly; error?: boolean; reason?: string }
  if (data.error) throw new Error(`Open-Meteo marine error: ${data.reason}`)
  return data.hourly
}

export interface WeatherHourly {
  time: string[]
  wind_speed_10m?: number[]
  wind_direction_10m?: number[]
  surface_pressure?: number[]
  precipitation?: number[]
}

export async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherHourly> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'hourly',
    'wind_speed_10m,wind_direction_10m,surface_pressure,precipitation',
  )
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo weather request failed: ${res.status}`)
  const data = (await res.json()) as { hourly: WeatherHourly; error?: boolean; reason?: string }
  if (data.error) throw new Error(`Open-Meteo weather error: ${data.reason}`)
  return data.hourly
}
