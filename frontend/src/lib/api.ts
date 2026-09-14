import type { BeachConditions } from '@/types/conditions'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? res.statusText
  } catch {
    return res.statusText
  }
}

export async function getConditions(lat: number, lon: number): Promise<BeachConditions> {
  const url = new URL('/api/conditions', API_BASE_URL)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))

  const res = await fetch(url)
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res))
  return res.json()
}

export interface GeocodeApiResult {
  result: { lat: number; lon: number; displayName: string }
  queryUsed: string
}

export async function geocodeBeach(
  name: string,
  city: string,
  state: string,
): Promise<GeocodeApiResult> {
  const url = new URL('/api/geocode', API_BASE_URL)
  url.searchParams.set('name', name)
  url.searchParams.set('city', city)
  url.searchParams.set('state', state)

  const res = await fetch(url)
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res))
  return res.json()
}
