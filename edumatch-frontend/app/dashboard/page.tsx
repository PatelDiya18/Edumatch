'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpenCheck,
  Compass,
  Search,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { DailyPlan } from '@/components/daily-plan'
import { Button } from '@/components/ui/button'
import { getDashboard, type DashboardData } from '@/lib/api'
import { getRecommendedResources, type ResourceResponse } from '@/lib/resources'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [recommendations, setRecommendations] = useState<ResourceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [greeting, setGreeting] = useState('Welcome back')
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')
  }, [])

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError('')
      setRecommendationError(null)
      setRecommendations(null)

      try {
        const data = await getDashboard()
        if (!active) return
        setDashboard(data)

        const profile = data.profiles[0]
        if (profile) {
          setRecommendationsLoading(true)
          try {
            const result = await getRecommendedResources(profile.profile_id)
            if (active) setRecommendations(result)
          } catch (err) {
            if (active) {
              setRecommendationError(
                err instanceof Error ? err.message : 'Unable to load recommendations.',
              )
            }
          } finally {
            if (active) setRecommendationsLoading(false)
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load your dashboard.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [retryToken])

  const profile = dashboard?.profiles[0]
  const result = profile?.latest_diagnostic
  const baseline = profile?.baseline
  const firstName = dashboard?.student.name.trim().split(/\s+/)[0]
  const recommendedResources = [
    ...(recommendations?.preferred_recommendations ?? []),
    ...(recommendations?.alternative_recommendations ?? []),
  ]
  const greetingDescription = !profile
    ? 'Complete your learning profile and baseline assessment to get started.'
    : recommendationsLoading
      ? 'Preparing learning resources tailored to your profile…'
      : recommendationError
        ? 'Your learning recommendations are temporarily unavailable.'
        : recommendedResources.length > 0
          ? `${recommendedResources.length} tailored resources are ready to explore.`
          : 'No recommendations are available yet. You can revisit your learning profile or ask LearnTwin for help.'

  return (
    <AppShell contentClassName="max-w-none px-0 py-0" userLevel={profile?.current_level}>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-7 sm:px-6 sm:py-9 lg:gap-8">
        {loading ? (
          <section aria-live="polite" className="flex flex-col gap-6" aria-label="Loading dashboard">
            <div className="animate-pulse rounded-2xl border border-slate-800 bg-indigo-400/[0.06] p-6 sm:p-8">
              <div className="h-4 w-28 rounded bg-slate-800" />
              <div className="mt-4 h-9 w-full max-w-lg rounded bg-slate-800" />
              <div className="mt-3 h-4 w-2/3 max-w-md rounded bg-slate-800" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(17rem,3fr)]">
              <div className="h-[28rem] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
              <div className="flex flex-col gap-6">
                <div className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
                <div className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
              </div>
            </div>
          </section>
        ) : error ? (
          <section role="alert" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-white">Unable to load your dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <Button
              className="mt-5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"
              onClick={() => setRetryToken((value) => value + 1)}
            >
              Reload dashboard
            </Button>
          </section>
        ) : dashboard && (
          <>
            <section className="overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-400/[0.12] via-slate-900/80 to-slate-900/70 p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="flex items-center gap-2 text-sm font-medium text-indigo-300">
                      <Sparkles className="size-4" aria-hidden="true" />
                      Your adaptive study space
                    </p>
                    <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {firstName ? `${greeting}, ${firstName}` : greeting}
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                      {greetingDescription}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="h-11 w-fit shrink-0 rounded-xl bg-indigo-500 px-4 text-white hover:bg-indigo-400"
                    render={<Link href="/search" />}
                  >
                    <Search className="size-4" />
                    Ask LearnTwin
                  </Button>
                </div>

                {profile ? (
                  <div className="flex flex-col gap-4 border-t border-indigo-300/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300 ring-1 ring-inset ring-indigo-300/15">
                        <Target className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">
                          Active learning target
                        </p>
                        <p className="mt-1 truncate font-semibold text-white">{profile.topic}</p>
                        <p className="mt-0.5 text-sm text-slate-400">{profile.goal}</p>
                      </div>
                    </div>
                    <Link
                      href="/onboarding"
                      className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      Switch topic <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(17rem,3fr)] lg:gap-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/10 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Today&apos;s learning plan</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {profile
                        ? 'Resources selected for your topic, goal, and learning format.'
                        : 'Your recommendations will appear after onboarding.'}
                    </p>
                  </div>
                  {profile && !recommendationsLoading && !recommendationError ? (
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
                      {recommendedResources.length} recommendations
                    </span>
                  ) : null}
                </div>
                {profile ? (
                  <DailyPlan
                    resources={recommendedResources}
                    loading={recommendationsLoading}
                    error={recommendationError}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center">
                    <p className="text-sm text-slate-300">
                      Set up a topic and take your baseline assessment to get recommendations.
                    </p>
                    <Button
                      className="mt-4 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"
                      render={<Link href="/onboarding" />}
                    >
                      Set up learning profile <ArrowRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-6">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/10 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300 ring-1 ring-inset ring-indigo-400/15">
                      <Trophy className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-white">Learning snapshot</h2>
                      <p className="text-xs text-slate-400">From your saved assessments</p>
                    </div>
                  </div>
                  {profile ? (
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-400">Proficiency</span>
                        <span className="rounded-full bg-indigo-400/10 px-2.5 py-1 text-xs font-medium text-indigo-200">
                          {profile.current_level}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                          <p className="text-xl font-semibold text-white">
                            {result ? `${result.score}/${result.total_questions}` : '—'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Latest diagnostic</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                          <p className="text-xl font-semibold text-white">{profile.total_assessments}</p>
                          <p className="mt-1 text-xs text-slate-400">Assessments</p>
                        </div>
                      </div>
                      {result ? (
                        <p className="text-sm text-slate-400">
                          Latest score: <span className="font-medium text-slate-200">{result.percentage}%</span>
                        </p>
                      ) : (
                        <Link
                          href="/quiz"
                          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          Take your diagnostic <ArrowRight className="size-4" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">
                      Your assessment summary will appear here after you create a learning profile.
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/10 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300 ring-1 ring-inset ring-indigo-400/15">
                      <BookOpenCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-white">Knowledge baseline</h2>
                      <p className="text-xs text-slate-400">Your first saved diagnostic</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    {baseline
                      ? 'Your starting point, measured by your earliest saved assessment.'
                      : 'A short diagnostic sets a starting point for your learning topic.'}
                  </p>
                  {baseline ? (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-2xl font-semibold text-white">{baseline.percentage}%</p>
                      <p className="mt-1 text-sm text-slate-300">{baseline.level}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {baseline.score} of {baseline.total_questions} correct
                      </p>
                    </div>
                  ) : null}
                  <Button
                    className="mt-4 w-full rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"
                    render={<Link href="/quiz" />}
                  >
                    {baseline ? 'Retake baseline quiz' : 'Take baseline quiz'}
                    {baseline ? <Compass className="size-4" /> : <ArrowRight className="size-4" />}
                  </Button>
                </section>
              </aside>
            </section>
          </>
        )}
        </div>
      </div>
    </AppShell>
  )
}
