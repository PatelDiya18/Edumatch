
'use client'

import { ArrowUpRight, BookOpen, Dumbbell, FileText } from 'lucide-react'
import type { Resource } from '@/lib/resources'

export function DailyPlan({
  resources,
  loading,
  error,
}: {
  resources: Resource[]
  loading: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading recommendations…
        </p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-200">
            No recommendations available yet
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Your learning resources will appear here when they are ready.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {resources.map((resource) => {
            const Icon =
              resource.format === 'interactive'
                ? Dumbbell
                : resource.format === 'text'
                  ? FileText
                  : BookOpen

            return (
              <li
                key={resource.url}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-indigo-400/40 hover:bg-slate-900/80 sm:flex-row sm:items-center sm:p-5"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300 ring-1 ring-inset ring-indigo-400/15">
                  <Icon className="size-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-100">
                      {resource.title}
                    </h3>
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-400">
                      {resource.format}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {resource.reason}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {resource.relevance_score}% match
                  </p>
                </div>

                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-400/50 hover:bg-indigo-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  Open resource
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
