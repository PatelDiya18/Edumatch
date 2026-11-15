
'use client'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href="/" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Theme
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

