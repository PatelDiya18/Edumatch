import { Chip } from '@/components/chip'
import type { Concept } from '@/lib/learn-twin'
import { cn } from '@/lib/utils'

const statusMap: Record<Concept['status'], { label: string; tone: 'success' | 'warning' | 'destructive'; bar: string }> = {
  strong: { label: 'Strong', tone: 'success', bar: 'bg-[var(--success)]' },
  progress: { label: 'In progress', tone: 'warning', bar: 'bg-[var(--warning)]' },
  weak: { label: 'Needs work', tone: 'destructive', bar: 'bg-destructive' },
}

export function ConceptList({ concepts }: { concepts: Concept[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {concepts.map((concept) => {
        const meta = statusMap[concept.status]
        return (
          <li key={concept.name} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{concept.name}</span>
                <Chip tone={meta.tone}>{meta.label}</Chip>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-700 ease-out', meta.bar)}
                  style={{ width: `${concept.mastery}%` }}
                />
              </div>
            </div>
            <span className="w-10 text-right text-sm font-semibold tabular-nums text-muted-foreground">
              {concept.mastery}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
