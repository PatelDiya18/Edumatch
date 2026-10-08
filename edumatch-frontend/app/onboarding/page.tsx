
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { testBackend } from '@/lib/api'

export default function OnboardingPage() {
  const [backendStatus, setBackendStatus] = useState<string | null>(null)
  const [isTestingBackend, setIsTestingBackend] = useState(false)

  const handleBackendTest = async () => {
    setIsTestingBackend(true)
    setBackendStatus(null)

    try {
      const data = await testBackend()
      setBackendStatus(data.message ?? 'Backend is connected.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect to the backend.'
      setBackendStatus(message)
    } finally {
      setIsTestingBackend(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="lg" className="h-9 rounded-xl px-3" render={<Link href="/" />}>
              <ArrowLeft className="size-4" />
              Back home
            </Button>
          </div>
        </div>
      </header>
      <div className="px-4 py-12 sm:px-6 sm:py-16">
        <OnboardingWizard />
        <div className="mx-auto mt-6 flex w-full max-w-xl justify-center">
          <Button type="button" variant="outline" onClick={handleBackendTest} disabled={isTestingBackend}>
            {isTestingBackend ? 'Testing backend...' : 'Test My Backend'}
          </Button>
          {backendStatus ? (
            <p className="mt-2 text-center text-sm text-muted-foreground" role="status">
              {backendStatus}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
