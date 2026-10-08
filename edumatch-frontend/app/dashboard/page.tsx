'use client'

import Link from 'next/link'
import { ArrowRight, Compass, Flame, Search, Sparkles, Target, Trophy } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Chip } from '@/components/chip'
import { DailyPlan } from '@/components/daily-plan'
import { ProgressRing } from '@/components/progress-ring'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLearnTwin } from '@/lib/learn-twin'

export default function DashboardPage() {
  const { twin } = useLearnTwin()
  const xpPct = Math.round((twin.xp / twin.xpToNext) * 100)

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
              Hi {twin.studentName}, here&apos;s your plan for today
            </h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="size-4 text-primary" />
              {twin.goal}
            </p>
          </div>
          <Button size="lg" className="h-11 rounded-xl px-5" render={<Link href="/search" />}>
            <Search className="size-4" />
            Ask LearnTwin
          </Button>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Today&apos;s adaptive plan</CardTitle>
              <Chip tone="primary">
                <Sparkles className="size-3.5" />
                {twin.preference} learner
              </Chip>
            </CardHeader>
            <CardContent>
              <DailyPlan concepts={twin.concepts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Trophy className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold leading-none text-foreground">Level {twin.level}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {twin.xp.toLocaleString()} / {twin.xpToNext.toLocaleString()} XP
                  </p>
                </div>
              </div>
              <div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${xpPct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {twin.xpToNext - twin.xp} XP to level {twin.level + 1}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                <span className="grid size-9 place-items-center rounded-lg bg-[var(--warning)]/15 text-[var(--warning)]">
                  <Flame className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{twin.streak}-day streak</p>
                  <p className="text-xs text-muted-foreground">Keep it alive today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge baseline</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              {twin.baseline ? (
                <>
                  <ProgressRing value={twin.baseline.score} size={120} strokeWidth={11} sublabel="baseline" />
                  <p className="text-sm text-muted-foreground">
                    Captured across {twin.baseline.total} concepts. Your plan targets the weakest first.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Take a 2-minute knowledge check so we can tune your path to what you already know.
                  </p>
                  <Button size="lg" className="h-11 rounded-xl px-5" render={<Link href="/quiz" />}>
                    Take the quiz
                    <ArrowRight className="size-4" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Continue learning</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Pick up curated material matched to your {twin.preference.toLowerCase()} style.
              </p>
              <Button variant="outline" size="lg" className="h-11 justify-start rounded-xl" render={<Link href="/resources" />}>
                <Compass className="size-4" />
                Browse resources
              </Button>
              <Button variant="outline" size="lg" className="h-11 justify-start rounded-xl" render={<Link href="/search" />}>
                <Search className="size-4" />
                Start a search session
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Learning Twin</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                See the full model of your understanding, retention, and concept mastery.
              </p>
              <Button className="h-11 justify-start rounded-xl" render={<Link href="/twin" />}>
                <Sparkles className="size-4" />
                Open my twin
                <ArrowRight className="ml-auto size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
