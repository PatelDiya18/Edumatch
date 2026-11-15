
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { ReadinessTrend } from '@/components/charts/ReadinessTrend'
import { TopicStrengthBars } from '@/components/charts/TopicStrengthBars'
import { Button } from '@/components/ui/button'
import { getTwin, type TwinData, type TwinTopic } from '@/lib/api'

export default function TwinHealthPage() {
  const [twin, setTwin] = useState<TwinData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
  const controller = new AbortController()

  getTwin(controller.signal)
  .then((data) => {
    console.log('Complete Learning Twin response:', data)
    console.log('Readiness trend:', data.trend)
    console.log('Number of trend records:', data.trend?.length)

    setTwin(data)
  })
    .catch((cause: unknown) => {
      if (controller.signal.aborted) return

      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load your Learning Twin.',
      )
    })
    .finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })

  return () => controller.abort()
}, [])

  const fadingTopics = useMemo(
    () => twin?.topics.filter((topic) => topic.status === 'fading') ?? [],
    [twin],
  )

  const solidTopics = useMemo(
    () => twin?.topics.filter((topic) => topic.status === 'solid') ?? [],
    [twin],
  )

  const newTopics = useMemo(
    () => twin?.topics.filter((topic) => topic.status === 'not_started') ?? [],
    [twin],
  )

  return (
    <AppShell contentClassName="max-w-6xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Dashboard
          </Link>

          <span className="text-sm font-semibold tracking-tight text-foreground">
            Learn<span className="text-primary">Twin</span>
          </span>
        </header>

        {loading ? (
          <TwinLoading />
        ) : error || !twin ? (
          <section
            role="alert"
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h1 className="text-lg font-semibold text-card-foreground">
              Your Learning Twin is unavailable
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error || 'No learner profile is available yet.'}
            </p>

            <Button className="mt-5" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </section>
        ) : (
          <>
            {/* Learning Twin Readiness */}
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-lg sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Your learning twin
              </p>

              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                {twin.readiness === null ? (
                  <>Complete a diagnostic to estimate your readiness.</>
                ) : (
                  <>
                    You&apos;re about{' '}
                    <span className="text-primary">
                      {Math.round(twin.readiness)}%
                    </span>{' '}
                    ready for your next quiz.
                  </>
                )}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {twin.readiness === null
                  ? `Take a diagnostic to see your progress for ${twin.topicName}.`
                  : `Your twin estimates this from your answers and how long ago you practiced each topic in ${twin.topicName}.`}
              </p>

              {fadingTopics.length > 0 ? (
                <Button
                  className="mt-5 min-h-11 rounded-xl"
                  render={<Link href={`/resources?id=${twin.profile_id}`} />}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Refresh {fadingTopics.length}{' '}
                  {fadingTopics.length === 1 ? 'topic' : 'topics'} · about{' '}
                  {fadingTopics.length * 4} min
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
            </section>

            {/* Readiness Trend */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-card-foreground">
                Readiness over time
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Based on your saved diagnostic results.
              </p>

              <div className="mt-4">
                <ReadinessTrend trend={twin.trend} />
              </div>
            </section>

            {/* Topic Strength */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <TopicStrengthBars topics={twin.topics} />
            </section>

            {/* Topics needing refresh */}
            {fadingTopics.length > 0 ? (
              <TopicSection
                title="Needs a refresh"
                topics={fadingTopics}
                actionLabel="Refresh"
                profileId={twin.profile_id}
                tone="amber"
              />
            ) : null}

            {/* Strong topics */}
            {solidTopics.length > 0 ? (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-card-foreground">
                  Going well
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  No action needed. Your twin will tell you when these need a refresh.
                </p>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {solidTopics.map((topic) => (
                    <li
                      key={topic.id}
                      className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300"
                    >
                      {topic.name}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* New topics */}
            {newTopics.length > 0 ? (
              <TopicSection
                title="Not learned yet"
                topics={newTopics}
                actionLabel="Start"
                profileId={twin.profile_id}
                tone="slate"
              />
            ) : null}

            {/* Empty history */}
            {twin.topics.length === 0 && !twin.history_available ? (
              <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Topic-level history is not available for older diagnostic records.
                Complete a new diagnostic to build a Twin from saved answer history.
              </p>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  )
}

function TopicSection({
  title,
  topics,
  actionLabel,
  profileId,
  tone,
}: {
  title: string
  topics: TwinTopic[]
  actionLabel: string
  profileId: number
  tone: 'amber' | 'slate'
}) {
  const highlight =
    tone === 'amber'
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-muted-foreground'

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className={`text-lg font-semibold ${highlight}`}>
        {title}
      </h2>

      <ul className="mt-4 flex flex-col divide-y divide-border">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                <BookOpen className="size-4" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <h3 className="font-medium text-card-foreground">
                  {topic.name}
                </h3>

                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {topic.note}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="min-h-10 shrink-0 rounded-lg border-border text-foreground"
              render={<Link href={`/resources?id=${profileId}`} />}
            >
              {actionLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TwinLoading() {
  return (
    <div
      className="flex flex-col gap-5"
      role="status"
      aria-label="Loading Learning Twin"
    >
      <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      <div className="h-72 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}


