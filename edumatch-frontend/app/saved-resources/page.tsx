
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bookmark,
  BookmarkX,
  BookOpen,
  Dumbbell,
  FileText,
  Compass,
} from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import type { Resource } from '@/lib/resources'
import {
  getSavedResources,
  removeSavedResource,
  subscribeToSavedResources,
} from '@/lib/saved-resources'

export default function SavedResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])

  useEffect(() => {
    const refreshSavedResources = () => {
      setResources(getSavedResources())
    }

    refreshSavedResources()

    return subscribeToSavedResources(refreshSavedResources)
  }, [])

  const handleRemove = (url: string) => {
    removeSavedResource(url)
  }

  return (
    <AppShell>
      <div className="p-4 sm:p-8">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-wide text-indigo-500">
            YOUR PERSONAL LEARNING LIBRARY
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            Saved Resources
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            All your bookmarked learning materials in one place.
          </p>

          <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Bookmark className="size-4 text-indigo-500" />
            {resources.length} saved {resources.length === 1 ? 'resource' : 'resources'}
          </div>
        </div>

        {/* Empty state */}
        {resources.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <span className="grid size-16 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Bookmark className="size-8" />
            </span>

            <h2 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">
              Your library is waiting!
            </h2>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              You haven't saved any resources yet. Explore your personalized
              recommendations and bookmark the ones you want to revisit.
            </p>

            <Link
              href="/resources"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
            >
              <Compass className="size-4" />
              Explore Resources
            </Link>
          </div>
        ) : (
          /* Saved resource cards */
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => {
              const Icon =
                resource.format === 'interactive'
                  ? Dumbbell
                  : resource.format === 'text'
                    ? FileText
                    : BookOpen

              return (
                <article
                  key={resource.url}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                      <Icon className="size-5" />
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemove(resource.url)}
                      aria-label={`Remove ${resource.title} from saved resources`}
                      title="Remove from saved resources"
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <BookmarkX className="size-4" />
                    </button>
                  </div>

                  <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                    {resource.title}
                  </h2>

                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {resource.reason}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-3 py-1 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {resource.format}
                    </span>

                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {resource.relevance_score}% match
                    </span>
                  </div>

                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
                  >
                    Open Resource
                    <ArrowUpRight className="size-4" />
                  </a>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
