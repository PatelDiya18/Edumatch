'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="lg" className="h-9 rounded-xl px-3" render={<Link href="/quiz" />}>
            Log in
          </Button>
          <Button size="lg" className="h-9 rounded-xl px-4" render={<Link href="/onboarding" />}>
            Get started
          </Button>
        </div>
      </div>
    </header>
  )
}
