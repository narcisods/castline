export interface MarineHourly {
  time: string[]
  wave_height?: (number | null)[]
  wave_period?: (number | null)[]
  wave_direction?: (number | null)[]
  swell_wave_height?: (number | null)[]
  swell_wave_period?: (number | null)[]
  swell_wave_direction?: (number | null)[]
}

export async function fetchMarineForecast(lat: number, lon: number): Promise<MarineHourly> {
  const url = new URL('https://marine-api.open-meteo.com/v1/marine')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'hourly',
    'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction',
  )
  url.searchParams.set('length_unit', 'imperial')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo marine request failed: ${res.status}`)
  const data = (await res.json()) as { hourly: MarineHourly; error?: boolean; reason?: string }
  if (data.error) throw new Error(`Open-Meteo marine error: ${data.reason}`)
  return data.hourly
}
