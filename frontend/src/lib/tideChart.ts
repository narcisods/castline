/** Extracts minutes-since-midnight from a local ISO timestamp like "2026-09-13T14:30:00". */
export function timeToMinutesOfDay(iso: string): number {
  const timePart = iso.split('T')[1] ?? '00:00:00'
  const [hh, mm] = timePart.split(':')
  return Number(hh) * 60 + Number(mm)
}

export interface Point {
  x: number
  y: number
}

/** Catmull-Rom (tension 1/6) to cubic-bezier conversion - a smooth curve through every point. */
export function buildSmoothPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  const segments = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    segments.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
  }
  return segments.join(' ')
}

function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }
  return niceFraction * 10 ** exponent
}

/** "Nice" evenly-spaced tick values spanning at least [min, max] (Heckbert's algorithm). */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min]
  const range = niceNum(max - min, false)
  const step = niceNum(range / (count - 1), true)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    ticks.push(Math.round(v * 100) / 100)
  }
  return ticks
}

/** Current minutes-since-midnight in Pacific time, regardless of the viewer's own timezone. */
export function getPacificNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const hour = lookup.hour === '24' ? 0 : Number(lookup.hour)
  return hour * 60 + Number(lookup.minute)
}

export function getPacificToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

export function formatClockTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h < 12 ? 'am' : 'pm'
  const displayHour = h % 12 === 0 ? 12 : h % 12
  return `${displayHour}:${String(m).padStart(2, '0')}${period}`
}
