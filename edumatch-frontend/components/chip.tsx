import { cn } from '@/lib/utils'

type ChipProps = React.ComponentProps<'span'> & {
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'outline'
}

const toneMap: Record<NonNullable<ChipProps['tone']>, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-accent text-accent-foreground',
  success: 'bg-[var(--success)]/12 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/15 text-[var(--warning)]',
  destructive: 'bg-destructive/12 text-destructive',
  outline: 'border border-border text-foreground',
}

export function Chip({ className, tone = 'default', ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        toneMap[tone],
        className,
      )}
      {...props}
    />
  )
}
