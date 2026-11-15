
'use client'

import type { TwinTrendPoint } from '@/lib/api'

const viewWidth = 600
const viewHeight = 190
const left = 48
const right = 580
const top = 24
const bottom = 150

export function ReadinessTrend({ trend }: { trend: TwinTrendPoint[] }) {
  // Keep only valid readiness values and sort them chronologically.
  const validTrend = [...trend]
    .filter(
      (point) =>
        Number.isFinite(point.readiness) &&
        typeof point.date === 'string'
    )
    .sort(
      (a, b) => Date.parse(a.date) - Date.parse(b.date)
    )

  if (validTrend.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-200">
          Your readiness trend will appear here
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Complete a diagnostic to start tracking your readiness.
        </p>
      </div>
    )
  }

  const points = validTrend.map((point, index) => ({
    x:
      validTrend.length === 1
        ? (left + right) / 2
        : left + (index / (validTrend.length - 1)) * (right - left),
    y:
      bottom -
      (Math.max(0, Math.min(100, point.readiness)) / 100) *
        (bottom - top),
    value: point.readiness,
  }))

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`

    const previous = points[index - 1]
    const midX = (previous.x + point.x) / 2

    return `${path} Q ${midX} ${previous.y} ${point.x} ${point.y}`
  }, '')

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`
      : ''

  const first = validTrend[0]
  const last = validTrend[validTrend.length - 1]

  const change = Math.round(last.readiness - first.readiness)

  const elapsedMs = Math.max(
    0,
    Date.parse(last.date) - Date.parse(first.date)
  )

  const elapsedWeeks =
    elapsedMs / (7 * 24 * 60 * 60 * 1000)

  const weekLabel =
    elapsedWeeks < 0.1
      ? 'less than 0.1'
      : elapsedWeeks.toFixed(1)

  const midpoint = validTrend[
    Math.floor((validTrend.length - 1) / 2)
  ]

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-slate-200">
          {validTrend.length === 1
            ? 'Your initial readiness'
            : change > 0
              ? `Up ${change} points in ${weekLabel} weeks`
              : change < 0
                ? `Down ${Math.abs(change)} points in ${weekLabel} weeks`
                : `No change across ${weekLabel} weeks`}
        </p>

        <span className="text-xs text-slate-400">
          {last.readiness}% latest
        </span>
      </div>

      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label={`Readiness trend from ${first.readiness}% to ${last.readiness}%`}
        className="mt-4 w-full overflow-visible"
      >
        <defs>
          <linearGradient
            id="readiness-area"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#818cf8"
              stopOpacity=".24"
            />
            <stop
              offset="100%"
              stopColor="#818cf8"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0, 50, 100].map((value) => {
          const y =
            bottom - (value / 100) * (bottom - top)

          return (
            <g key={value}>
              <line
                x1={left}
                x2={right}
                y1={y}
                y2={y}
                stroke="#334155"
                strokeDasharray="3 6"
              />

              <text
                x="4"
                y={y + 4}
                fill="#94a3b8"
                fontSize="12"
              >
                {value}%
              </text>
            </g>
          )
        })}

        {points.length > 1 && (
          <>
            <path
              d={areaPath}
              fill="url(#readiness-area)"
            />

            <path
              d={linePath}
              fill="none"
              stroke="#818cf8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </>
        )}

        {points.map((point, index) => (
          <circle
            key={`${validTrend[index].date}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 6 : 4}
            fill="#a5b4fc"
            stroke="#1e1b4b"
            strokeWidth="2"
          />
        ))}

        <text
          x={points[points.length - 1].x}
          y={Math.max(14, points[points.length - 1].y - 12)}
          fill="#c7d2fe"
          fontSize="13"
          fontWeight="600"
          textAnchor="middle"
        >
          {last.readiness}%
        </text>

        <text
          x={left}
          y="180"
          fill="#94a3b8"
          fontSize="12"
        >
          {validTrend.length > 1
            ? `${weekLabel} weeks ago`
            : 'First assessment'}
        </text>

        <text
          x={(left + right) / 2}
          y="180"
          fill="#94a3b8"
          fontSize="12"
          textAnchor="middle"
        >
          {validTrend.length > 1
            ? new Date(midpoint.date).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric' }
              )
            : ''}
        </text>

        <text
          x={right}
          y="180"
          fill="#94a3b8"
          fontSize="12"
          textAnchor="end"
        >
          {validTrend.length > 1 ? 'Now' : ''}
        </text>
      </svg>

      {validTrend.length === 1 && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Complete another diagnostic to see your progress over time.
        </p>
      )}
    </div>
  )
}
