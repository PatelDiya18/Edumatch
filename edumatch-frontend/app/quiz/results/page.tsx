'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, LayoutDashboard, RotateCcw, XCircle } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { getLatestQuizResult, type SavedQuizResult } from '@/lib/api'

export default function QuizResultsPage() {
  return (
    <AppShell>
      <Suspense fallback={<ResultsLoading />}>
        <QuizResults />
      </Suspense>
    </AppShell>
  )
}

function QuizResults() {
  const searchParams = useSearchParams()
  const profileId = Number(searchParams.get('profile_id'))
  const [result, setResult] = useState<SavedQuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    if (!Number.isSafeInteger(profileId) || profileId <= 0) {
      setError('A valid learner profile is required to view diagnostic results.')
      setLoading(false)
      return () => controller.abort()
    }

    setLoading(true)
    setError('')
    getLatestQuizResult(profileId, controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Unable to load diagnostic results.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [profileId])

  const topicResults = useMemo(() => {
    if (!result) return []

    const topics = new Map<string, { correct: number; total: number }>()
    for (const answer of result.answer_review) {
      const score = topics.get(answer.subtopic) ?? { correct: 0, total: 0 }
      topics.set(answer.subtopic, {
        correct: score.correct + Number(answer.selected_answer === answer.correct_answer),
        total: score.total + 1,
      })
    }

    return [...topics.entries()]
      .map(([name, score]) => ({
        name,
        ...score,
        percentage: Math.round((score.correct / score.total) * 100),
      }))
      .sort((a, b) => a.percentage - b.percentage)
  }, [result])

  if (loading) return <ResultsLoading />

  if (error || !result) {
    return (
      <section role="alert" className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">Unable to load your results</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || 'No saved diagnostic result was found for this profile.'}
        </p>
        <Button className="mt-5" render={<Link href="/dashboard" />}>
          <LayoutDashboard className="size-4" />
          Go to dashboard
        </Button>
      </section>
    )
  }

  const weakTopics = topicResults.filter((topic) => topic.percentage < 50)
  const strongTopics = topicResults.filter((topic) => topic.percentage >= 80)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-primary">{result.topic}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Diagnostic results</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your saved results and question review are available here after refreshing.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-3">
          <ResultMetric label="Score" value={`${result.score} / ${result.total_questions}`} />
          <ResultMetric label="Percentage" value={`${result.percentage}%`} />
          <ResultMetric label="Proficiency" value={result.level} />
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
            {result.score} correct
          </span>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <XCircle className="size-4 text-rose-400" aria-hidden="true" />
            {result.total_questions - result.score} incorrect
          </span>
        </div>
      </section>

      {result.answer_review.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Topic-wise performance</h2>
          <div className="mt-4 flex flex-col divide-y divide-border">
            {topicResults.map((topic) => (
              <div key={topic.name} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{topic.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {topic.correct} of {topic.total} correct
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {topic.percentage}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <TopicSummary title="Areas to review" topics={weakTopics.map((topic) => topic.name)} />
            <TopicSummary title="Areas going well" topics={strongTopics.map((topic) => topic.name)} />
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Per-question review is unavailable for this older saved result. The score and proficiency
          above are from the persisted assessment.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="h-11 flex-1 rounded-xl"
          render={<Link href={`/resources?id=${result.profile_id}`} />}
        >
          Explore Recommended Resources
          <ArrowRight className="size-4" />
        </Button>
        <Button size="lg" variant="outline" className="h-11 rounded-xl" render={<Link href="/quiz" />}>
          <RotateCcw className="size-4" />
          Retake quiz
        </Button>
      </div>
    </div>
  )
}

function ResultsLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" role="status" aria-label="Loading results">
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-56 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function TopicSummary({ title, topics }: { title: string; topics: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {topics.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <li key={topic} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {topic}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No topics in this category.</p>
      )}
    </div>
  )
}
