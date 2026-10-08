'use client'

import { useState } from 'react'
import { Clock, PlayCircle, Sparkles, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Chip } from '@/components/chip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Resource } from '@/lib/resources'
import { cn } from '@/lib/utils'

const formatTone: Record<Resource['format'], 'primary' | 'success' | 'warning'> = {
  visual: 'primary',
  interactive: 'success',
  text: 'warning',
  Visual: 'primary',
  Interactive: 'success',
  Text: 'warning',
}

export function ResourceCard({
  resource,
  showReason = false,
  onFeedback,
}: {
  resource: Resource
  showReason?: boolean
  onFeedback?: (helpful: boolean, resource: Resource) => void
}) {
  const [rated, setRated] = useState<null | boolean>(null)

  const handle = (helpful: boolean) => {
    setRated(helpful)
    onFeedback?.(helpful, resource)
  }

  const rating = resource.rating ?? (resource.relevance_score ? Math.round((resource.relevance_score / 20) * 10) / 10 : 4.5)

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={formatTone[resource.format]}>{resource.format}</Chip>
          {resource.type && <Chip tone="outline">{resource.type}</Chip>}
          {resource.concept && <Chip>{resource.concept}</Chip>}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">
          <Star className="size-3.5 fill-[var(--warning)] text-[var(--warning)]" />
          {rating}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold leading-snug text-foreground">{resource.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{resource.summary || resource.reason}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{resource.source || 'EduMatch'}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" />
          {resource.minutes ?? 15} min
        </span>
        <span>{resource.difficulty || 'Beginner'}</span>
      </div>

      {showReason ? (
        <div className="flex items-start gap-2 rounded-xl bg-accent/60 p-3 text-sm text-accent-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          <p className="leading-relaxed">{resource.matchReason || resource.reason}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button size="sm" className="h-9 rounded-lg">
          <PlayCircle className="size-4" />
          Start
        </Button>
        {onFeedback ? (
          <div className="flex items-center gap-2">
            {rated !== null ? (
              <span className="text-xs font-medium text-muted-foreground">
                {rated ? 'Twin updated, thanks!' : 'Noted, adjusting.'}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Was this helpful?</span>
            )}
            <Button
              variant="outline"
              size="icon"
              aria-label="Helpful"
              className={cn('size-9 rounded-lg', rated === true && 'border-primary bg-accent text-accent-foreground')}
              onClick={() => handle(true)}
            >
              <ThumbsUp className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Not helpful"
              className={cn('size-9 rounded-lg', rated === false && 'border-destructive bg-destructive/10 text-destructive')}
              onClick={() => handle(false)}
            >
              <ThumbsDown className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
