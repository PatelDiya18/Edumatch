'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CircleCheck, RefreshCw, Sparkles } from 'lucide-react'
import { Chip } from '@/components/chip'
import { ConceptList } from '@/components/concept-list'
import { MetricBar } from '@/components/metric-bar'
import { ProgressRing } from '@/components/progress-ring'
import { TwinSnapshot } from '@/components/twin-snapshot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLearnTwin } from '@/lib/learn-twin'

export function TwinDetail() {
  const { twin } = useLearnTwin()

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Chip tone="primary">
              <Sparkles className="size-3.5" />
              Living model
            </Chip>
            {twin.updated ? (
              <Chip tone="success">
                <CircleCheck className="size-3.5" />
                Just updated
              </Chip>
            ) : null}
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            {twin.studentName}&apos;s Learning Twin
          </h1>
          <p className="text-muted-foreground">
            Studying <span className="font-medium text-foreground">{twin.topic}</span> as a{' '}
            {twin.preference.toLowerCase()} learner.
          </p>
        </div>
        <Button size="lg" className="h-11 rounded-xl px-5" render={<Link href="/search" />}>
          Feed your twin
          <ArrowRight className="size-4" />
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Core signals</CardTitle>
        </CardHeader>
        <CardContent>
          <TwinSnapshot metrics={twin.metrics} size={112} />
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Signal breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <MetricBar label="Understanding" value={twin.metrics.understanding} tone="primary" hint="How well core ideas connect." />
            <MetricBar label="Retention" value={twin.metrics.retention} tone="success" hint="How much sticks over time." />
            <MetricBar label="Application" value={twin.metrics.application} tone="warning" hint="Turning theory into solved problems." />
            <MetricBar label="Confidence" value={twin.metrics.confidence} tone="destructive" hint="Self-reported and behavior-adjusted." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge baseline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            {twin.baseline ? (
              <>
                <ProgressRing value={twin.baseline.score} size={116} strokeWidth={11} sublabel="baseline" />
                <p className="text-xs text-muted-foreground">
                  Your starting point across {twin.baseline.total} concepts. Signals grow from here as
                  you study.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Take the knowledge check to set a baseline for {twin.topic}.
                </p>
                <Button size="lg" className="h-11 rounded-xl px-5" render={<Link href="/quiz" />}>
                  Take the quiz
                  <ArrowRight className="size-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Concept mastery map</CardTitle>
          </CardHeader>
          <CardContent>
            <ConceptList concepts={twin.concepts} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              <CardTitle>Weak areas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {twin.weakAreas.map((area) => (
                <Chip key={area} tone="destructive">
                  {area}
                </Chip>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <RefreshCw className="size-4 text-[var(--warning)]" />
              <CardTitle>Revision due</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {twin.revisionNeeded.map((area) => (
                <Chip key={area} tone="warning">
                  {area}
                </Chip>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="bg-accent/40">
        <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-foreground">
              Every resource you rate and every session you finish nudges these signals. Rate a few
              curated resources to watch your twin evolve in real time.
            </p>
          </div>
          <Button size="lg" className="h-11 shrink-0 rounded-xl px-5" render={<Link href="/search" />}>
            Start curating
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
