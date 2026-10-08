'use client'

import Link from 'next/link'
import { ArrowRight, BrainCircuit, ClipboardCheck, LineChart, ListChecks, Sparkles } from 'lucide-react'
import { Chip } from '@/components/chip'
import { Button } from '@/components/ui/button'

const flow = [
  {
    icon: ClipboardCheck,
    step: 'Step 1',
    title: 'Take a quick diagnostic',
    body: 'A short prerequisite quiz sets your honest baseline — no self-rating.',
    tone: 'text-[var(--chart-1)]',
    ring: 'border-[var(--chart-1)]/40 bg-[var(--chart-1)]/10',
  },
  {
    icon: BrainCircuit,
    step: 'Step 2',
    title: 'Your Twin adapts',
    body: 'It models your understanding, retention, and weak spots in real time.',
    tone: 'text-[var(--chart-4)]',
    ring: 'border-[var(--chart-4)]/40 bg-[var(--chart-4)]/10',
  },
  {
    icon: LineChart,
    step: 'Step 3',
    title: 'Track mastery grow',
    body: 'Post-tests measure the delta so you see exactly how far you moved.',
    tone: 'text-[var(--chart-2)]',
    ring: 'border-[var(--chart-2)]/40 bg-[var(--chart-2)]/10',
  },
]

export function LandingHero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
      <div className="flex flex-col gap-6">
        <Chip tone="primary" className="w-fit">
          <Sparkles className="size-3.5" />
          Your Adaptive Study OS
        </Chip>
        <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Stop studying harder.{' '}
          <span className="text-primary">Study like it knows you.</span>
        </h1>
        <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          LearnTwin builds a living model of your knowledge, confidence, and retention, then curates
          the right resource at the right moment. Not another LMS — an operating system for how you
          learn.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-11 rounded-xl px-5 text-base"
            render={<Link href="/onboarding" />}
          >
            Create my Learning Twin
            <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 rounded-xl px-5 text-base"
            render={<Link href="/quiz" />}
          >
            <ListChecks className="size-4" />
            Try the diagnostic
          </Button>
        </div>
        <p className="pt-1 text-sm text-muted-foreground">
          Already have a twin?{' '}
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            Go to your dashboard
          </Link>
        </p>
      </div>

      <div className="relative">
        <div className="relative z-10 overflow-hidden rounded-3xl border border-white/10 bg-card/70 p-6 shadow-xl backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <BrainCircuit className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">How LearnTwin works</p>
                <p className="text-xs text-muted-foreground">Three steps to an adaptive loop</p>
              </div>
            </div>
            <Chip tone="primary">Live</Chip>
          </div>

          <ol className="flex flex-col gap-3">
            {flow.map((item, i) => (
              <li key={item.step} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl border ${item.ring} ${item.tone}`}
                  >
                    <item.icon className="size-5" />
                  </span>
                  {i < flow.length - 1 ? (
                    <span aria-hidden="true" className="mt-1 h-8 w-px flex-1 bg-gradient-to-b from-border to-transparent" />
                  ) : null}
                </div>
                <div className="flex flex-col gap-0.5 pb-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${item.tone}`}>
                    {item.step}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              The twin closes the loop — every session and post-test reshapes what you see next.
            </p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute -inset-6 -z-0 rounded-[2.5rem] bg-gradient-to-br from-primary/25 via-[var(--chart-4)]/15 to-transparent blur-3xl"
        />
      </div>
    </section>
  )
}
