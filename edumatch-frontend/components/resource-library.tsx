'use client'

import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Chip } from '@/components/chip'
import { ResourceCard } from '@/components/resource-card'
import { Card } from '@/components/ui/card'
import { useLearnTwin, type LearningMode } from '@/lib/learn-twin'
import { resources, type Resource } from '@/lib/resources'
import { cn } from '@/lib/utils'

const filters: ('All' | LearningMode)[] = ['All', 'Visual', 'Text', 'Interactive']

export function ResourceLibrary() {
  const { twin, applyFeedback } = useLearnTwin()
  const [filter, setFilter] = useState<'All' | LearningMode>('All')

  const recommended = useMemo(
    () => resources.filter((r: Resource) => Boolean(r.concept && twin.weakAreas.includes(r.concept))).slice(0, 2),
    [twin.weakAreas],
  )

  const filtered = useMemo(
    () =>
      filter === 'All'
        ? resources
        : resources.filter((r: Resource) => r.format === filter || r.format.toLowerCase() === filter.toLowerCase()),
    [filter],
  )

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
          Curated resource library
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Every resource is tagged and ranked against your Learning Twin, so the right format always
          rises to the top.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Recommended for your weak areas</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {recommended.map((resource: Resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              showReason
              onFeedback={(helpful) =>
                applyFeedback(
                  helpful,
                  (resource.format.charAt(0).toUpperCase() + resource.format.slice(1)) as LearningMode,
                )
              }
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Browse everything</h2>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}>
                <Chip
                  tone={filter === f ? 'primary' : 'outline'}
                  className={cn('cursor-pointer', filter !== f && 'hover:bg-muted')}
                >
                  {f}
                </Chip>
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((resource: Resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No {filter.toLowerCase()} resources yet.
          </Card>
        )}
      </section>
    </div>
  )
}
