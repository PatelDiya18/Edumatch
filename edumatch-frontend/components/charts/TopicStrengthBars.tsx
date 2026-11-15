'use client'

import type { TwinTopic } from '@/lib/api'

const statusStyles = {
  solid: {
    label: 'Solid',
    bar: 'bg-emerald-400',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  fading: {
    label: 'Fading',
    bar: 'bg-amber-400',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  not_started: {
    label: 'Not started',
    bar: 'bg-slate-500',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
  },
} as const

export function TopicStrengthBars({ topics }: { topics: TwinTopic[] }) {
  const sortedTopics = [...topics].sort((a, b) => {
    if (a.strength === null) return b.strength === null ? a.name.localeCompare(b.name) : 1
    if (b.strength === null) return -1
    return b.strength - a.strength
  })

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-100">Where you&apos;re strong and where you&apos;re not</h2>
      <p className="mt-1 text-sm text-slate-400">How well you&apos;d do on each topic today.</p>

      {sortedTopics.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-4">
          {sortedTopics.map((topic) => {
            const style = statusStyles[topic.status]
            return (
              <li key={topic.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-slate-200">{topic.name}</span>
                  <span className={`shrink-0 text-sm font-medium tabular-nums ${style.text}`}>
                    {topic.strength === null ? 'Not started' : `${topic.strength}%`}
                  </span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"
                  role="img"
                  aria-label={`${topic.name}: ${topic.status === 'not_started' ? 'not started' : `${topic.strength}% strength, ${style.label}`}`}
                >
                  {topic.strength !== null ? (
                    <div
                      className={`h-full rounded-full ${style.bar}`}
                      style={{ width: `${Math.max(0, Math.min(100, topic.strength))}%` }}
                    />
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-400">
          Topic strengths will appear after diagnostic answer history is available.
        </p>
      )}

      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2" aria-label="Topic status legend">
        {Object.values(statusStyles).map((style) => (
          <li key={style.label} className="inline-flex items-center gap-2 text-xs text-slate-400">
            <span className={`size-2 rounded-full ${style.dot}`} aria-hidden="true" />
            {style.label}
          </li>
        ))}
      </ul>
    </section>
  )
}
