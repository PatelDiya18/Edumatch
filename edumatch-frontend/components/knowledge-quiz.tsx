'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BrainCircuit, Check, RotateCcw, X } from 'lucide-react'
import { ProgressRing } from '@/components/progress-ring'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getDiagnosticQuestions } from '@/lib/api'
import { useLearnTwin, type Baseline, type DiagnosticQuestion } from '@/lib/learn-twin'
import { cn } from '@/lib/utils'

export function KnowledgeQuiz({ profileId }: { profileId?: string }) {
  const router = useRouter()
  const { twin, seedFromDiagnostic } = useLearnTwin()
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([])
  const [diagnosticTopic, setDiagnosticTopic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<Baseline | null>(null)

  const loadQuestions = useCallback(async () => {
    const parsedProfileId = Number(profileId)
    if (!profileId || !Number.isInteger(parsedProfileId) || parsedProfileId <= 0) {
      setLoadError('Start from onboarding to generate questions for your topic.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    try {
      const generated = await getDiagnosticQuestions(parsedProfileId)
      setDiagnosticTopic(generated.topic)
      setQuestions(generated.questions.map((question, index) => ({
        id: `question-${index}`,
        concept: question.subtopic,
        prompt: question.question,
        options: question.options,
        answer: question.correct_answer,
        explain: question.explanation,
      })))
      setStep(0)
      setAnswers({})
      setResult(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load topic-specific questions.')
    } finally {
      setIsLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  const total = questions.length
  const current = questions[step]
  const selected = answers[current?.id]
  const answeredCount = Object.keys(answers).length

  const select = (index: number) => {
    if (current) setAnswers((prev) => ({ ...prev, [current.id]: index }))
  }

  const next = () => {
    if (step < total - 1) {
      setStep((s) => s + 1)
    } else {
      setResult(seedFromDiagnostic(answers, questions))
    }
  }

  const restart = () => {
    setAnswers({})
    setStep(0)
    setResult(null)
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4" role="status">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Preparing your diagnostic</h1>
        <p className="text-sm text-muted-foreground">
          Loading your saved questions about {diagnosticTopic ?? twin.topic}...
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Could not prepare your diagnostic</h1>
        <p className="text-sm text-destructive" role="alert">{loadError}</p>
        {profileId ? (
          <Button size="lg" className="h-11 w-fit rounded-xl" onClick={() => void loadQuestions()}>
            Try again
            <RotateCcw className="size-4" />
          </Button>
        ) : (
          <Button size="lg" className="h-11 w-fit rounded-xl" onClick={() => router.push('/onboarding')}>
            Start onboarding
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    )
  }

  if (result) {
    return (
      <QuizResult
        result={result}
        answers={answers}
        questions={questions}
        onRestart={restart}
        onContinue={() => router.push('/dashboard')}
        onTwin={() => router.push('/twin')}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <BrainCircuit className="size-3.5" />
          Prerequisite diagnostic
        </span>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Let&apos;s check what you already know about {diagnosticTopic ?? twin.topic}
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Answer a few quick questions. Your Learning Twin uses this to set an honest starting
          baseline — no self-rating required.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${((step + (selected !== undefined ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {step + 1} / {total}
        </span>
      </div>

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            {current.concept}
          </span>
        </div>
        <h2 className="text-lg font-semibold leading-snug text-foreground">{current.prompt}</h2>
        <div className="flex flex-col gap-2.5">
          {current.options.map((option, index) => {
            const active = selected === index
            return (
              <button
                key={option}
                type="button"
                onClick={() => select(index)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all',
                  active
                    ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_var(--primary)]'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/40',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground',
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="lg"
          className="h-11 rounded-xl"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        <Button
          size="lg"
          className="h-11 rounded-xl px-6"
          onClick={next}
          disabled={selected === undefined}
        >
          {step === total - 1 ? `See my baseline (${answeredCount}/${total})` : 'Next'}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function QuizResult({
  result,
  answers,
  questions,
  onRestart,
  onContinue,
  onTwin,
}: {
  result: Baseline
  answers: Record<string, number>
  questions: DiagnosticQuestion[]
  onRestart: () => void
  onContinue: () => void
  onTwin: () => void
}) {
  const readiness = useMemo(() => {
    if (result.score >= 70) return { label: 'Strong start', tone: 'text-[var(--success)]' }
    if (result.score >= 40) return { label: 'Solid foundation', tone: 'text-[var(--warning)]' }
    return { label: 'Fresh start', tone: 'text-primary' }
  }, [result.score])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Check className="size-3.5" />
          Baseline captured
        </span>
        <ProgressRing value={result.score} size={140} strokeWidth={12} sublabel="baseline" />
        <div className="flex flex-col gap-1">
          <p className={cn('text-lg font-semibold', readiness.tone)}>{readiness.label}</p>
          <p className="text-sm text-muted-foreground">
            You got {result.correct} of {result.total} right. Your twin has been seeded and your
            adaptive plan is ready.
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-2.5">
        <h2 className="px-1 text-sm font-semibold text-foreground">Question review</h2>
        {questions.map((q) => {
          const correct = answers[q.id] === q.answer
          return (
            <Card key={q.id} className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
                  correct ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-destructive/12 text-destructive',
                )}
              >
                {correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">{q.prompt}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{q.concept}:</span> {q.explain}
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="h-11 flex-1 rounded-xl" onClick={onContinue}>
          Go to dashboard
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="outline" size="lg" className="h-11 rounded-xl" onClick={onTwin}>
          View my twin
        </Button>
        <Button variant="ghost" size="lg" className="h-11 rounded-xl" onClick={onRestart}>
          <RotateCcw className="size-4" />
          Retake
        </Button>
      </div>
    </div>
  )
}
