import { useQuery } from '@tanstack/react-query'
import { AlertTriangleIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TideChart } from '@/components/TideChart'
import { getConditions } from '@/lib/api'
import type { Beach } from '@/types/beach'

interface ConditionsPanelProps {
  beach: Beach
}

function formatHour(iso: string): string {
  const [, timePart] = iso.split('T')
  const [hourStr] = timePart.split(':')
  const hour = Number(hourStr)
  const period = hour < 12 ? 'am' : 'pm'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}${period}`
}

function formatTime(iso: string): string {
  const [, timePart] = iso.split('T')
  const [hourStr, minStr] = timePart.split(':')
  const hour = Number(hourStr)
  const period = hour < 12 ? 'am' : 'pm'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minStr}${period}`
}

function fmt(value: number | null, unit: string): string {
  return value === null ? '—' : `${value}${unit}`
}

// All conditions data is in Pacific local time (every beach is Pacific coast).
// Using the browser's own local hour would be wrong for anyone viewing from
// outside Pacific time, so this reads "now" in Pacific time explicitly rather
// than trusting the viewer's local clock interpretation.
function currentHourIso(date: string): string {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    hour12: false,
  }).format(new Date())
  const normalizedHour = hour === '24' ? '00' : hour.padStart(2, '0')
  return `${date}T${normalizedHour}:00:00`
}

export function ConditionsPanel({ beach }: ConditionsPanelProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['conditions', beach.lat, beach.lon],
    queryFn: () => getConditions(beach.lat, beach.lon),
  })

  if (isLoading) {
    return <p className="text-muted-foreground">Loading today's conditions…</p>
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>Couldn't load conditions</AlertTitle>
        <AlertDescription>{error instanceof Error ? error.message : 'Unknown error'}</AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  const nowIso = currentHourIso(data.date)

  return (
    <div className="flex flex-col gap-4">
      {data.warnings.length > 0 && (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>Some data is unavailable</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Today's tide</h2>
        <TideChart hourly={data.hourly} tideEvents={data.tideEvents} date={data.date} />
        <div className="mt-3 flex flex-wrap gap-2">
          {data.tideEvents.map((event) => (
            <Badge key={event.time} variant={event.type === 'high' ? 'default' : 'secondary'}>
              {event.type === 'high' ? 'High' : 'Low'} {event.heightFt}ft @ {formatTime(event.time)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Tide</TableHead>
              <TableHead>Wave</TableHead>
              <TableHead>Swell</TableHead>
              <TableHead>Wind</TableHead>
              <TableHead>Pressure</TableHead>
              <TableHead>Precip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.hourly.map((row) => (
              <TableRow key={row.time} className={row.time === nowIso ? 'bg-accent' : undefined}>
                <TableCell className="font-medium">{formatHour(row.time)}</TableCell>
                <TableCell>{fmt(row.tideHeightFt, 'ft')}</TableCell>
                <TableCell>
                  {fmt(row.waveHeightFt, 'ft')} @ {fmt(row.wavePeriodSec, 's')}
                </TableCell>
                <TableCell>
                  {fmt(row.swellHeightFt, 'ft')} @ {fmt(row.swellPeriodSec, 's')}
                </TableCell>
                <TableCell>
                  {fmt(row.windSpeedMph, 'mph')} {row.windDirectionDeg ?? '—'}°
                </TableCell>
                <TableCell>
                  {fmt(row.pressureHpa, 'hPa')}
                  {row.pressureTrend && (
                    <span className="ml-1 text-muted-foreground">({row.pressureTrend})</span>
                  )}
                </TableCell>
                <TableCell>{fmt(row.precipitationIn, 'in')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
