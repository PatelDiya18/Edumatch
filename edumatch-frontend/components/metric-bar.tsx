import { cn } from '@/lib/utils'

type MetricBarProps = {
  label: string
  value: number
  tone?: 'primary' | 'success' | 'warning' | 'destructive'
  hint?: string
  className?: string
}

const toneMap: Record<NonNullable<MetricBarProps['tone']>, string> = {
  primary: 'bg-primary',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  destructive: 'bg-destructive',
}

export function MetricBar({ label, value, tone = 'primary', hint, className }: MetricBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">{clamped}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-out', toneMap[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
