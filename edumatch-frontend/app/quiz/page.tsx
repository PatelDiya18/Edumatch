import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { KnowledgeQuiz } from '@/components/knowledge-quiz'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ profile_id?: string }>
}) {
  const { profile_id: profileId } = await searchParams

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="lg"
              className="h-9 rounded-xl px-3"
              render={<Link href="/onboarding" />}
            >
              <ArrowLeft className="size-4" />
              Onboarding
            </Button>
          </div>
        </div>
      </header>
      <div className="px-4 py-12 sm:px-6 sm:py-16">
        <KnowledgeQuiz profileId={profileId} />
      </div>
    </div>
  )
}
