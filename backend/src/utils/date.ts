const PACIFIC_TZ = 'America/Los_Angeles'

/**
 * Today's calendar date in Pacific time, as YYYY-MM-DD. Every beach on the
 * list is Pacific coast, so this is deliberately hardcoded rather than
 * derived per-beach. Using the server process's local date instead would be
 * wrong for a large fraction of real usage once deployed to a UTC host: for
 * roughly 5pm-midnight Pacific, UTC's calendar date is already tomorrow.
 */
export function getPacificTodayDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

export function pacificTodayAsNoaaDate(): string {
  return getPacificTodayDate().replaceAll('-', '')
}

/**
 * Buckets a source-specific local timestamp to a comparable "YYYY-MM-DDTHH:00"
 * key. NOAA returns "YYYY-MM-DD HH:mm" (space, no seconds); Open-Meteo
 * returns "YYYY-MM-DDTHH:mm" (T, no seconds). Both are already local time for
 * the given coordinates, so no timezone conversion is needed here - only
 * format alignment.
 */
export function normalizeHourKey(timestamp: string): string {
  const [datePart, timePart] = timestamp.replace(' ', 'T').split('T')
  const hour = timePart.slice(0, 2)
  return `${datePart}T${hour}:00`
}
