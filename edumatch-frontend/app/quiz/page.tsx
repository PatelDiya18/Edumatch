'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import {
  generateDiagnosticQuestions,
  getDiagnosticQuestions,
  getMyProfile,
  submitQuiz,
} from "@/lib/api";
import { getStoredProfileId, saveProfileId } from "@/lib/profile-storage";

interface Question {
   id: number;
  question: string;
  options: string[];
  subtopic: string;
  difficulty: string;
}

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [selectedTopic, setSelectedTopic] = useState('Data Structures & Algorithms')

  useEffect(() => {
    async function loadQuiz() {
      try {
        const queryProfileId = Number(
          new URLSearchParams(window.location.search).get("profile_id"),
        )
        let resolvedProfileId =
          Number.isSafeInteger(queryProfileId) && queryProfileId > 0
            ? queryProfileId
            : getStoredProfileId()

        if (resolvedProfileId === null) {
          const profile = await getMyProfile()
          resolvedProfileId = profile.profile_id
        }
        if (resolvedProfileId === null) {
          throw new Error("No learner profile was found. Please complete onboarding.")
        }

        saveProfileId(resolvedProfileId)
        setProfileId(resolvedProfileId)

        let result
        try {
          result = await getDiagnosticQuestions(resolvedProfileId)
        } catch (error) {
          const message = error instanceof Error ? error.message : ""
          if (!/quiz not generated|no diagnostic questions|no diagnostic quiz/i.test(message)) {
            throw error
          }
          await generateDiagnosticQuestions(resolvedProfileId)
          result = await getDiagnosticQuestions(resolvedProfileId)
        }

        setSelectedTopic(result.topic)

        setQuestions(result.questions)
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load the diagnostic quiz.",
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [])

  const handleSelectOption = (optionIndex: number) => {
    const question = questions[currentQuestion]
    if (!question) return
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
  }

  const handleFinishQuiz = async () => {
    if (!profileId) {
      setSubmitError("Profile ID not found. Please complete onboarding again.")
      return
    }

    try {
      setIsSubmitting(true)

      await submitQuiz(
        profileId,
        questions.map((question) => ({
          question_id: question.id,
          selected_answer: answers[question.id],
        })),
      )

      router.push(`/resources?id=${profileId}`)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to submit your diagnostic.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">
            Generating 10 diagnostic questions for {selectedTopic}...
          </p>
        </div>
      </main>
    )
  }

  if (loadError || questions.length === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-destructive" role="alert">
          {loadError ?? "No diagnostic questions are available."}
        </p>
        <Button onClick={() => router.push("/onboarding")}>Return to onboarding</Button>
      </main>
    )
  }

  const q = questions[currentQuestion]

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-8 bg-card border border-border p-6 rounded-2xl shadow-sm">

        {/* Progress header */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Diagnostic: {selectedTopic}</span>
            <span>Question {currentQuestion + 1} of {questions.length}</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question content */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{q?.question}</h2>

          <div className="space-y-2">
            {q?.options.map((option, idx) => {
              const isSelected = answers[q.id] === idx
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between font-medium ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && <CheckCircle2 className="size-5 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="ghost"
            disabled={currentQuestion === 0}
            onClick={() => setCurrentQuestion((prev) => prev - 1)}
          >
            Previous
          </Button>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion((prev) => prev + 1)}
              disabled={answers[q.id] === undefined}
            >
              Next Question
            </Button>
          ) : (
            <Button
              onClick={handleFinishQuiz}
              disabled={answers[q.id] === undefined || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? 'Analyzing Twin...' : 'Complete & View Resources'}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

      </div>
    </main>
  )
}