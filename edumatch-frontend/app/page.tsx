import { LandingFeatures } from '@/components/landing-features'
import { LandingHero } from '@/components/landing-hero'
import { MarketingHeader } from '@/components/marketing-header'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <LandingHero />
      <LandingFeatures />
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>LearnTwin — your adaptive study OS.</p>
          <p>Built for students who want to learn smarter.</p>
        </div>
      </footer>
    </div>
  )
}
