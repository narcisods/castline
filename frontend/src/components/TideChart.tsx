import { useRef, useState } from 'react'
import {
  buildSmoothPath,
  formatClockTime,
  getPacificNowMinutes,
  getPacificToday,
  niceTicks,
  timeToMinutesOfDay,
} from '@/lib/tideChart'
import type { HourlyConditions, TideEvent } from '@/types/conditions'

interface TideChartProps {
  hourly: HourlyConditions[]
  tideEvents: TideEvent[]
  date: string
}

const WIDTH = 720
const HEIGHT = 220
const MARGIN = { top: 32, right: 16, bottom: 28, left: 34 }
const INNER_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const INNER_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const X_TICK_HOURS = [0, 4, 8, 12, 16, 20, 24]

export function TideChart({ hourly, tideEvents, date }: TideChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null)

  const points = hourly
    .filter((h): h is HourlyConditions & { tideHeightFt: number } => h.tideHeightFt !== null)
    .map((h) => ({ minutes: timeToMinutesOfDay(h.time), heightFt: h.tideHeightFt }))

  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Tide curve unavailable.</p>
  }

  const values = points.map((p) => p.heightFt)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  // Pad the range before computing ticks so the highest/lowest point never
  // sits exactly on the top/bottom gridline - that's also where its label goes.
  const pad = Math.max((dataMax - dataMin) * 0.2, 0.5)
  const ticks = niceTicks(dataMin - pad, dataMax + pad, 4)
  const yMin = ticks[0]
  const yMax = ticks.at(-1) as number

  const xScale = (minutes: number) => MARGIN.left + (minutes / 1440) * INNER_WIDTH
  const yScale = (ft: number) => MARGIN.top + (1 - (ft - yMin) / (yMax - yMin)) * INNER_HEIGHT

  const svgPoints = points.map((p) => ({ x: xScale(p.minutes), y: yScale(p.heightFt) }))
  const linePath = buildSmoothPath(svgPoints)
  const areaPath = `${linePath} L ${svgPoints.at(-1)?.x} ${MARGIN.top + INNER_HEIGHT} L ${svgPoints[0].x} ${MARGIN.top + INNER_HEIGHT} Z`

  const isToday = date === getPacificToday()
  const nowMinutes = isToday ? getPacificNowMinutes() : null

  function nearestPoint(minutes: number) {
    return points.reduce((best, p) =>
      Math.abs(p.minutes - minutes) < Math.abs(best.minutes - minutes) ? p : best,
    )
  }

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const localX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const minutes = ((localX - MARGIN.left) / INNER_WIDTH) * 1440
    setHoverMinutes(Math.max(0, Math.min(1440, minutes)))
  }

  const hovered = hoverMinutes === null ? null : nearestPoint(hoverMinutes)

  return (
    <div className="tide-chart-vars relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Tide height over the course of today"
        onPointerLeave={() => setHoverMinutes(null)}
      >
        <defs>
          <linearGradient id="tide-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--tide-line)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--tide-line)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y-axis labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--tide-grid)"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 8} y={yScale(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px]">
              {t}ft
            </text>
          </g>
        ))}

        {/* x-axis labels */}
        {X_TICK_HOURS.map((h) => (
          <text
            key={h}
            x={xScale(h * 60)}
            y={HEIGHT - 8}
            textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}
            className="fill-muted-foreground text-[10px]"
          >
            {formatClockTime((h % 24) * 60).replace(':00', '')}
          </text>
        ))}

        <path d={areaPath} fill="url(#tide-area-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--tide-line)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* high/low markers with direct labels */}
        {tideEvents.map((event) => {
          const minutes = timeToMinutesOfDay(event.time)
          const x = xScale(minutes)
          const y = yScale(event.heightFt)
          // Always label above the marker: the padded y-domain guarantees room,
          // and it keeps every label clear of the x-axis hour labels below.
          return (
            <g key={event.time}>
              <circle cx={x} cy={y} r={4} fill="var(--tide-line)" stroke="var(--tide-surface)" strokeWidth={2} />
              <text x={x} y={y - 10} textAnchor="middle" className="fill-foreground text-[10px] font-medium">
                {event.heightFt}ft
              </text>
              <text x={x} y={y - 22} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {formatClockTime(minutes)}
              </text>
            </g>
          )
        })}

        {/* now marker */}
        {nowMinutes !== null && (
          <g>
            <line
              x1={xScale(nowMinutes)}
              x2={xScale(nowMinutes)}
              y1={MARGIN.top}
              y2={MARGIN.top + INNER_HEIGHT}
              stroke="var(--tide-now)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <text x={xScale(nowMinutes)} y={MARGIN.top - 6} textAnchor="middle" className="fill-muted-foreground text-[9px]">
              now
            </text>
          </g>
        )}

        {/* hover crosshair */}
        {hovered && (
          <g>
            <line
              x1={xScale(hovered.minutes)}
              x2={xScale(hovered.minutes)}
              y1={MARGIN.top}
              y2={MARGIN.top + INNER_HEIGHT}
              stroke="var(--tide-grid)"
              strokeWidth={1}
            />
            <circle
              cx={xScale(hovered.minutes)}
              cy={yScale(hovered.heightFt)}
              r={5}
              fill="var(--tide-line)"
              stroke="var(--tide-surface)"
              strokeWidth={2}
            />
          </g>
        )}

        {/* pointer capture layer */}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={INNER_WIDTH}
          height={INNER_HEIGHT}
          fill="transparent"
          onPointerMove={handlePointerMove}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
          style={{
            left: `${(xScale(hovered.minutes) / WIDTH) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-medium">{hovered.heightFt}ft</span>{' '}
          <span className="text-muted-foreground">@ {formatClockTime(hovered.minutes)}</span>
        </div>
      )}
    </div>
  )
}
