
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Bookmark, BookmarkCheck, ArrowUpRight } from 'lucide-react'

import {
  getRecommendedResources,
  type ResourceResponse,
  type Resource,
} from '@/lib/resources'
import { getMyProfile } from '@/lib/api'
import { saveProfileId } from '@/lib/profile-storage'
import { AppShell } from '@/components/app-shell'
import {
  getSavedResources,
  toggleSavedResource,
  subscribeToSavedResources,
} from '@/lib/saved-resources'

export default function ResourcesPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-8">
            <h1 className="text-2xl font-bold">
              Finding your resources...
            </h1>
            <p className="mt-2 text-muted-foreground">
              LearnTwin is finding resources based on your learning profile.
            </p>
          </div>
        }
      >
        <ResourcesContent />
      </Suspense>
    </AppShell>
  )
}

function ResourcesContent() {
  const searchParams = useSearchParams()
  const profileId = searchParams.get('id')

  const [data, setData] = useState<ResourceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedUrls, setSavedUrls] = useState<string[]>([])

  useEffect(() => {
    setSavedUrls(getSavedResources().map((resource) => resource.url))

    return subscribeToSavedResources(() => {
      setSavedUrls(getSavedResources().map((resource) => resource.url))
    })
  }, [])

  useEffect(() => {
    let active = true

    async function loadResources() {
      try {
        const resolvedProfileId =
          profileId === null
            ? (await getMyProfile()).profile_id
            : Number(profileId)

        if (
          !Number.isSafeInteger(resolvedProfileId) ||
          resolvedProfileId <= 0
        ) {
          throw new Error(
            'Student profile ID is missing or invalid. Please complete onboarding and the diagnostic quiz.'
          )
        }

        saveProfileId(resolvedProfileId)

        const result = await getRecommendedResources(resolvedProfileId)

        if (active) setData(result)
      } catch (err) {
        console.error('Resource error:', err)

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load resources.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadResources()

    return () => {
      active = false
    }
  }, [profileId])

  const handleBookmark = (resource: Resource) => {
    toggleSavedResource(resource)
  }

  const renderResource = (
    resource: Resource,
    index: number,
    type: 'preferred' | 'alternative'
  ) => {
    const saved = savedUrls.includes(resource.url)
    const isPreferred = type === 'preferred'

    return (
      <article
        key={resource.url}
        className={`rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
          isPreferred
            ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
            : 'border-orange-200 bg-white dark:border-orange-900/50 dark:bg-slate-950'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className={`text-sm font-semibold ${
              isPreferred ? 'text-green-600' : 'text-orange-600'
            }`}
          >
            {isPreferred
              ? `Preferred Resource #${index + 1}`
              : `Alternative Resource #${index + 1}`}
          </p>

          <button
            type="button"
            onClick={() => handleBookmark(resource)}
            aria-label={
              saved ? 'Remove saved resource' : 'Save resource'
            }
            title={saved ? 'Remove bookmark' : 'Save resource'}
            className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              saved
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300'
            }`}
          >
            {saved ? (
              <BookmarkCheck className="size-5" />
            ) : (
              <Bookmark className="size-5" />
            )}
          </button>
        </div>

        <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {resource.title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {resource.reason}
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="capitalize">
            Format: {resource.format}
          </span>
          <span>
            Match: {resource.relevance_score}/100
          </span>
        </div>

        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Open Resource
          <ArrowUpRight className="size-4" />
        </a>
      </article>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">
          Finding your resources...
        </h1>
        <p className="mt-2 text-muted-foreground">
          LearnTwin is finding resources based on your learning profile.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">
          Unable to load resources
        </h1>
        <p className="mt-3 text-red-500">{error}</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
        >
          <LayoutDashboard className="size-4" />
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-500">
            YOUR PERSONALIZED LEARNING LIBRARY
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            Resources for {data.topic}
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Personalized resources for {data.student_name}.
          </p>

          <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p><strong>Level:</strong> {data.level}</p>
            <p><strong>Preferred format:</strong> {data.preferred_format}</p>
            <p><strong>Goal:</strong> {data.goal}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/saved-resources"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
          >
            <Bookmark className="size-4" />
            Saved ({savedUrls.length})
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </div>
      </div>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Your Best Matches
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resources selected according to your learning preferences.
          </p>
        </div>

        {data.preferred_recommendations.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.preferred_recommendations.map((resource, index) =>
              renderResource(resource, index, 'preferred')
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
            No preferred resources are available yet.
          </p>
        )}
      </section>

      {data.alternative_recommendations.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            You Should Also Explore
          </h2>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            These alternatives may also help you achieve your learning goal.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.alternative_recommendations.map((resource, index) =>
              renderResource(resource, index, 'alternative')
            )}
          </div>
        </section>
      )}
    </div>
  )
}
