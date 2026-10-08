'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, MousePointerClick, Type } from 'lucide-react'
import { Chip } from '@/components/chip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useLearnTwin, type LearningMode } from '@/lib/learn-twin'
import { cn } from '@/lib/utils'
import { createProfile, generateDiagnosticQuestions } from '@/lib/api'



const preferences: { value: LearningMode; label: string; desc: string; icon: typeof BookOpen }[] = [
  { value: 'Visual', label: 'Visual', desc: 'Diagrams, videos, animations', icon: BookOpen },
  { value: 'Text', label: 'Text', desc: 'Articles, notes, references', icon: Type },
  { value: 'Interactive', label: 'Interactive', desc: 'Practice, quizzes, sandboxes', icon: MousePointerClick },
]

export function OnboardingWizard() {
  const router = useRouter()
  const { createTwin } = useLearnTwin()
  const [step, setStep] = useState(0)

  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [preference, setPreference] = useState<LearningMode>('Visual')
  const [goal, setGoal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const steps = ['Pick a topic', 'How you learn', 'Your goal']
  const canContinue = step === 0 ? topic.trim().length > 0 : step === 2 ? goal.trim().length > 0 : true

 const handleSubmit = async () => {
  setIsSubmitting(true)
  setSubmitError(null)

  try {
    const result = await createProfile({
      name: name.trim() || 'Learner',
      topic: topic.trim(),
      preferred_format: preference,
      goal: goal.trim(),
    })

    const profileId = result.profile_id

    if (!profileId) {
      throw new Error('Backend did not return a profile ID.')
    }

    await generateDiagnosticQuestions(profileId)

    createTwin({
      studentName: name.trim() || 'Learner',
      topic: topic.trim(),
       preference,
      goal: goal.trim(),
    })

    router.push(`/quiz?profile_id=${profileId}`)
  } catch (error1) {
    console.error('ONBOARDING ERROR:', error1)
    setSubmitError(
      error1 instanceof Error
        ? error1.message
        : 'Unable to start the diagnostic. Please try again.',
    )
  } finally {
    setIsSubmitting(false)
  }
};
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-2">
            <div
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                i <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
            <span
              className={cn(
                'text-xs font-medium',
                i <= step ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <Card className="p-6 sm:p-8">
        {step === 0 ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                What do you want to master?
              </h2>
              <p className="text-muted-foreground">
                Pick a topic and we&apos;ll build a learning path around it. Next we&apos;ll run a
                quick diagnostic to set your real starting point.
              </p>
            </div>
            <Field label="What should we call you?" htmlFor="name">
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav"
                className={inputClass}
              />
            </Field>
            <Field label="What are you learning right now?" htmlFor="topic" required>
              <input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
                className={inputClass}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {['Data Structures & Algorithms', 'Machine Learning', 'Organic Chemistry', 'Microeconomics'].map(
                (t) => (
                  <button key={t} type="button" onClick={() => setTopic(t)}>
                    <Chip tone="outline" className="cursor-pointer hover:bg-muted">
                      {t}
                    </Chip>
                  </button>
                ),
              )}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">How do you learn best?</h2>
              <p className="text-muted-foreground">
                Your twin starts with this format and re-tunes it from your feedback — no rating
                yourself.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-foreground">Preferred format</span>
              <div className="grid gap-3 sm:grid-cols-3">
                {preferences.map((p) => {
                  const active = preference === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPreference(p.value)}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
                        active
                          ? 'border-primary bg-accent'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-9 place-items-center rounded-lg',
                          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <p.icon className="size-4" />
                      </span>
                      <span className="text-sm font-semibold text-foreground">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">What&apos;s the goal?</h2>
              <p className="text-muted-foreground">This anchors how your learning path is sequenced.</p>
            </div>
            <Field label="Your current goal" htmlFor="goal" required>
              <textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="e.g. Ace my DSA midterm in three weeks"
                className={cn(inputClass, 'h-auto resize-none py-3')}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {['Pass an exam', 'Build a project', 'Interview prep', 'Just curious'].map((g) => (
                <button key={g} type="button" onClick={() => setGoal(g)}>
                  <Chip tone="outline" className="cursor-pointer hover:bg-muted">
                    {g}
                  </Chip>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="lg"
            className="h-11 rounded-xl"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {step < 2 ? (
            <Button
              size="lg"
              className="h-11 rounded-xl px-5"
              disabled={!canContinue}
              onClick={() => setStep((s) => Math.min(2, s + 1))}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-11 rounded-xl px-5"
              disabled={!canContinue || isSubmitting}
              onClick={handleSubmit}
            >
              <Check className="size-4" />
              {isSubmitting ? 'Preparing diagnostic...' : 'Start diagnostic'}
            </Button>
          )}
        </div>
        {submitError ? (
          <p className="mt-3 text-right text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
      </Card>
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40'

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  )
}
