import { Brain, Gauge, RefreshCw, Target } from 'lucide-react'
import { ProgressRing } from '@/components/progress-ring'
import type { TwinMetrics } from '@/lib/learn-twin'
import { cn } from '@/lib/utils'

const config = [
  { key: 'understanding', label: 'Understanding', icon: Brain, indicator: 'text-[var(--chart-1)]' },
  { key: 'retention', label: 'Retention', icon: RefreshCw, indicator: 'text-[var(--chart-2)]' },
  { key: 'application', label: 'Application', icon: Target, indicator: 'text-[var(--chart-5)]' },
  { key: 'confidence', label: 'Confidence', icon: Gauge, indicator: 'text-[var(--chart-4)]' },
] as const

export function TwinSnapshot({
  metrics,
  size = 96,
  className,
}: {
  metrics: TwinMetrics
  size?: number
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4', className)}>
      {config.map((item) => (
        <div key={item.key} className="flex flex-col items-center gap-2 text-center">
          <ProgressRing
            value={metrics[item.key]}
            size={size}
            strokeWidth={9}
            indicatorClassName={item.indicator}
          />
          <div className="flex items-center gap-1.5">
            <item.icon className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
