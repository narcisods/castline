export interface WeatherHourly {
  time: string[]
  wind_speed_10m?: (number | null)[]
  wind_direction_10m?: (number | null)[]
  surface_pressure?: (number | null)[]
  precipitation?: (number | null)[]
}

export async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherHourly> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'hourly',
    'wind_speed_10m,wind_direction_10m,surface_pressure,precipitation',
  )
  url.searchParams.set('wind_speed_unit', 'mph')
  url.searchParams.set('precipitation_unit', 'inch')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo weather request failed: ${res.status}`)
  const data = (await res.json()) as { hourly: WeatherHourly; error?: boolean; reason?: string }
  if (data.error) throw new Error(`Open-Meteo weather error: ${data.reason}`)
  return data.hourly
}
