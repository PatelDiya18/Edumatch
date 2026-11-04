'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Compass, Search, Target, Trophy } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboard, type DashboardData } from '@/lib/api'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getDashboard()
      .then((data) => {
        if (active) setDashboard(data)
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load your dashboard.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const profile = dashboard?.profiles[0]
  const result = profile?.latest_diagnostic

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {loading ? (
          <section aria-live="polite">
            <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
          </section>
        ) : error ? (
          <section role="alert" className="rounded-xl border border-destructive/30 bg-card p-6">
            <h1 className="text-2xl font-bold text-foreground">Unable to load your dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </section>
        ) : dashboard && (
          <>
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
                <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
                  Hi {dashboard.student.name}, here&apos;s your learning progress
                </h1>
                {profile ? (
                  <>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="size-4 text-primary" />
                      {profile.topic}
                    </p>
                    <p className="text-sm text-muted-foreground">{profile.goal}</p>
                  </>
                ) : null}
              </div>
              <Button size="lg" className="h-11 rounded-xl px-5" render={<Link href="/search" />}>
                <Search className="size-4" />
                Ask LearnTwin
              </Button>
            </section>

            {!profile ? (
              <Card>
                <CardHeader>
                  <CardTitle>Set up your learning profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-start gap-4">
                  <p className="text-sm text-muted-foreground">
                    Complete onboarding to choose a topic and personalize your learning plan.
                  </p>
                  <Button render={<Link href="/onboarding" />}>
                    Complete onboarding <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <section className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Latest diagnostic result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result ? (
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-4">
                          <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                            <Trophy className="size-5" />
                          </span>
                          <div>
                            <p className="text-2xl font-bold leading-none text-foreground">
                              {result.level}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">Proficiency level</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-xl bg-muted p-4">
                            <p className="text-2xl font-bold text-foreground">
                              {result.score} / {result.total_questions}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">Correct answers</p>
                          </div>
                          <div className="rounded-xl bg-muted p-4">
                            <p className="text-2xl font-bold text-foreground">{result.percentage}%</p>
                            <p className="mt-1 text-xs text-muted-foreground">Quiz score</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-4">
                        <p className="text-sm text-muted-foreground">
                          You have a profile for {profile.topic}, but no diagnostic result has been saved yet.
                        </p>
                        <Button render={<Link href="/quiz" />}>
                          Take the diagnostic <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Continue learning</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-start gap-4">
                    <p className="text-sm text-muted-foreground">
                      Explore resources matched to your {profile.topic} learning profile.
                    </p>
                    <Button variant="outline" className="rounded-xl" render={<Link href="/resources" />}>
                      <Compass className="size-4" />
                      Browse resources
                    </Button>
                  </CardContent>
                </Card>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
