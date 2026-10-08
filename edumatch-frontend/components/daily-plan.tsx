'use client'

import Link from 'next/link'
import { BookOpen, Circle, CircleCheck, PlayCircle, Search } from 'lucide-react'
import { Chip } from '@/components/chip'
import { Button } from '@/components/ui/button'
import type { Concept } from '@/lib/learn-twin'

type Task = {
  id: string
  title: string
  concept: string
  minutes: number
  href: string
  icon: typeof BookOpen
  done: boolean
}

export function DailyPlan({ concepts }: { concepts: Concept[] }) {
  const weakest = [...concepts].sort((a, b) => a.mastery - b.mastery)

  const tasks: Task[] = [
    {
      id: 'warmup',
      title: 'Warm-up recap',
      concept: weakest[weakest.length - 1]?.name ?? 'Fundamentals',
      minutes: 5,
      href: '/resources',
      icon: CircleCheck,
      done: true,
    },
    {
      id: 'focus',
      title: 'Focus drill',
      concept: weakest[0]?.name ?? 'Core concept',
      minutes: 20,
      href: '/search',
      icon: PlayCircle,
      done: false,
    },
    {
      id: 'stretch',
      title: 'Stretch practice',
      concept: weakest[1]?.name ?? 'Applied problems',
      minutes: 15,
      href: '/resources',
      icon: BookOpen,
      done: false,
    },
  ]

  const completed = tasks.filter((t) => t.done).length
  const totalMinutes = tasks.reduce((sum, t) => sum + t.minutes, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {completed} of {tasks.length} done · {totalMinutes} min planned
        </p>
        <Chip tone="primary">Adaptive</Chip>
      </div>

      <ul className="flex flex-col gap-3">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
          >
            <span
              className={
                task.done
                  ? 'grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--success)]/15 text-[var(--success)]'
                  : 'grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground'
              }
            >
              <task.icon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {task.done ? (
                  <CircleCheck className="size-3.5 text-[var(--success)]" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground" />
                )}
                {task.title}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {task.concept} · {task.minutes} min
              </span>
            </div>
            <Button
              variant={task.done ? 'ghost' : 'outline'}
              size="sm"
              className="h-9 shrink-0 rounded-lg"
              render={<Link href={task.href} />}
            >
              {task.done ? 'Review' : 'Start'}
            </Button>
          </li>
        ))}
      </ul>

      <Button size="lg" className="h-11 rounded-xl" render={<Link href="/search" />}>
        <Search className="size-4" />
        Ask LearnTwin for a custom session
      </Button>
    </div>
  )
}
