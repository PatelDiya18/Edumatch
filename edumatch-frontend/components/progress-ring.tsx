import { cn } from '@/lib/utils'

type ProgressRingProps = {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  className?: string
  trackClassName?: string
  indicatorClassName?: string
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className,
  trackClassName = 'text-muted',
  indicatorClassName = 'text-primary',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClassName}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', indicatorClassName)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {label ? (
          <span className="text-2xl font-bold tabular-nums text-foreground">{label}</span>
        ) : (
          <span className="text-2xl font-bold tabular-nums text-foreground">{clamped}%</span>
        )}
        {sublabel ? (
          <span className="mt-0.5 text-xs font-medium text-muted-foreground">{sublabel}</span>
        ) : null}
      </div>
    </div>
  )
}
