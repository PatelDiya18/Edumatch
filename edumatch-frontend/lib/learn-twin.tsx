'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Award, BrainCircuit, Flame, Rocket, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react'

export type LearningMode = 'Visual' | 'Text' | 'Interactive'

export type ConceptStatus = 'strong' | 'progress' | 'weak'

export type Concept = {
  name: string
  mastery: number
  status: ConceptStatus
}

export type TwinMetrics = {
  understanding: number
  retention: number
  application: number
  confidence: number
}

export type Baseline = {
  score: number
  correct: number
  total: number
}

export type LearningTwin = {
  studentName: string
  topic: string
  goal: string
  preference: LearningMode
  level: number
  xp: number
  xpToNext: number
  streak: number
  metrics: TwinMetrics
  concepts: Concept[]
  weakAreas: string[]
  revisionNeeded: string[]
  baseline: Baseline | null
  postTest: Baseline | null
  updated: boolean
}

export type DiagnosticQuestion = {
  id: string
  concept: string
  prompt: string
  options: string[]
  answer: number
  explain: string
}

const defaultTwin: LearningTwin = {
  studentName: 'Aarav',
  topic: 'Data Structures & Algorithms',
  goal: 'Ace my upcoming DSA midterm',
  preference: 'Visual',
  level: 7,
  xp: 2450,
  xpToNext: 3000,
  streak: 12,
  metrics: {
    understanding: 72,
    retention: 58,
    application: 64,
    confidence: 45,
  },
  concepts: [
    { name: 'Big-O Notation', mastery: 82, status: 'strong' },
    { name: 'Recursion', mastery: 38, status: 'weak' },
    { name: 'Linked Lists', mastery: 66, status: 'progress' },
    { name: 'Hash Maps', mastery: 74, status: 'strong' },
    { name: 'Sorting Algorithms', mastery: 71, status: 'progress' },
    { name: 'Dynamic Programming', mastery: 29, status: 'weak' },
  ],
  weakAreas: ['Recursion', 'Dynamic Programming'],
  revisionNeeded: ['Linked Lists', 'Sorting Algorithms'],
  baseline: null,
  postTest: null,
  updated: false,
}

type OnboardingInput = {
  studentName?: string
  topic: string
  preference: LearningMode
  goal: string
}

type LearnTwinContextValue = {
  twin: LearningTwin
  createTwin: (input: OnboardingInput) => void
  seedFromDiagnostic: (answers: Record<string, number>, questions: DiagnosticQuestion[]) => Baseline
  applyPostTest: (answers: Record<string, number>, questions: DiagnosticQuestion[]) => Baseline
  applyFeedback: (helpful: boolean, mode: LearningMode) => void
  resetUpdated: () => void
}

const statusForMastery = (mastery: number): ConceptStatus =>
  mastery >= 70 ? 'strong' : mastery >= 45 ? 'progress' : 'weak'

const LearnTwinContext = createContext<LearnTwinContextValue | null>(null)

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

function scoreAnswers(answers: Record<string, number>, questions: DiagnosticQuestion[]) {
  let correct = 0
  const conceptScores: Record<string, { correct: number; total: number }> = {}
  for (const question of questions) {
    const isCorrect = answers[question.id] === question.answer
    if (isCorrect) correct += 1
    const score = conceptScores[question.concept] ?? { correct: 0, total: 0 }
    conceptScores[question.concept] = {
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    }
  }
  return { correct, total: questions.length, conceptScores }
}

export function LearnTwinProvider({ children }: { children: React.ReactNode }) {
  const [twin, setTwin] = useState<LearningTwin>(defaultTwin)

  const createTwin = useCallback((input: OnboardingInput) => {
    setTwin((prev) => ({
      ...prev,
      studentName: input.studentName?.trim() || prev.studentName,
      topic: input.topic,
      goal: input.goal,
      preference: input.preference,
      baseline: null,
      postTest: null,
      updated: false,
    }))
  }, [])

  const seedFromDiagnostic = useCallback((answers: Record<string, number>, questions: DiagnosticQuestion[]) => {
    const { correct, total, conceptScores } = scoreAnswers(answers, questions)
    const score = clamp((correct / total) * 100)
    const baseline: Baseline = { score, correct, total }
    const concepts = Object.entries(conceptScores).map(([name, conceptScore]) => {
      const mastery = clamp((conceptScore.correct / conceptScore.total) * 100)
      return { name, mastery, status: statusForMastery(mastery) }
    })

    setTwin((prev) => {
      const avg = clamp(concepts.reduce((sum, c) => sum + c.mastery, 0) / concepts.length)
      return {
        ...prev,
        concepts,
        weakAreas: concepts.filter((c) => c.status === 'weak').map((c) => c.name),
        revisionNeeded: concepts.filter((c) => c.status === 'progress').map((c) => c.name),
        metrics: {
          understanding: avg,
          retention: clamp(avg - 14),
          application: clamp(avg - 8),
          confidence: clamp(score - 6),
        },
        baseline,
        postTest: null,
        updated: true,
      }
    })
    return baseline
  }, [])

  const applyPostTest = useCallback((answers: Record<string, number>, questions: DiagnosticQuestion[]) => {
    const { correct, total } = scoreAnswers(answers, questions)
    const score = clamp((correct / total) * 100)
    const postTest: Baseline = { score, correct, total }

    setTwin((prev) => {
      // Post-study test lifts mastery toward the demonstrated score.
      const concepts = prev.concepts.map((c) => {
        const lifted = clamp(Math.max(c.mastery, Math.round((c.mastery + score) / 2) + 6))
        return { ...c, mastery: lifted, status: statusForMastery(lifted) }
      })
      const avg = clamp(concepts.reduce((sum, c) => sum + c.mastery, 0) / concepts.length)
      return {
        ...prev,
        concepts,
        weakAreas: concepts.filter((c) => c.status === 'weak').map((c) => c.name),
        revisionNeeded: concepts.filter((c) => c.status === 'progress').map((c) => c.name),
        metrics: {
          understanding: avg,
          retention: clamp(avg - 6),
          application: clamp(avg - 2),
          confidence: clamp((prev.metrics.confidence + score) / 2 + 8),
        },
        xp: prev.xp + 260,
        postTest,
        updated: true,
      }
    })
    return postTest
  }, [])

  const applyFeedback = useCallback((helpful: boolean, mode: LearningMode) => {
    setTwin((prev) => {
      const delta = helpful ? 6 : -3
      const weakest = prev.weakAreas[0] ?? prev.concepts[0]?.name
      return {
        ...prev,
        preference: helpful ? mode : prev.preference,
        metrics: {
          understanding: clamp(prev.metrics.understanding + delta),
          retention: clamp(prev.metrics.retention + (helpful ? 4 : -2)),
          application: clamp(prev.metrics.application + (helpful ? 5 : -1)),
          confidence: clamp(prev.metrics.confidence + (helpful ? 7 : -2)),
        },
        xp: prev.xp + (helpful ? 120 : 20),
        concepts: prev.concepts.map((c) => {
          if (c.name !== weakest) return c
          const mastery = clamp(c.mastery + (helpful ? 14 : 2))
          return { ...c, mastery, status: statusForMastery(mastery) }
        }),
        updated: true,
      }
    })
  }, [])

  const resetUpdated = useCallback(() => {
    setTwin((prev) => (prev.updated ? { ...prev, updated: false } : prev))
  }, [])

  const value = useMemo(
    () => ({ twin, createTwin, seedFromDiagnostic, applyPostTest, applyFeedback, resetUpdated }),
    [twin, createTwin, seedFromDiagnostic, applyPostTest, applyFeedback, resetUpdated],
  )

  return <LearnTwinContext.Provider value={value}>{children}</LearnTwinContext.Provider>
}

export function useLearnTwin() {
  const ctx = useContext(LearnTwinContext)
  if (!ctx) throw new Error('useLearnTwin must be used within LearnTwinProvider')
  return ctx
}

/* ---------- Derived views of the twin (pure helpers) ---------- */

export type CognitiveTrait = { label: string; value: number }

export function getCognitiveTraits(twin: LearningTwin): CognitiveTrait[] {
  const m = twin.metrics
  return [
    { label: 'Conceptual Depth', value: m.understanding },
    { label: 'Retention', value: m.retention },
    { label: 'Application', value: m.application },
    { label: 'Confidence', value: m.confidence },
    { label: 'Problem Solving', value: clamp(m.application * 0.6 + m.understanding * 0.4) },
    { label: 'Consistency', value: clamp(38 + twin.streak * 3) },
  ]
}

export type KnowledgeTier = { label: string; nodes: Concept[] }

const tierMap: Record<string, number> = {
  'Big-O Notation': 0,
  Recursion: 0,
  'Linked Lists': 1,
  'Hash Maps': 1,
  'Sorting Algorithms': 1,
  'Dynamic Programming': 2,
  'Graph Traversal': 2,
}

const tierLabels = ['Foundations', 'Core structures', 'Advanced']

export function getKnowledgeTree(twin: LearningTwin): KnowledgeTier[] {
  const buckets: Concept[][] = [[], [], []]
  twin.concepts.forEach((c, i) => {
    const tier = tierMap[c.name] ?? Math.min(2, Math.floor((i / twin.concepts.length) * 3))
    buckets[tier].push(c)
  })
  return buckets
    .map((nodes, i) => ({ label: tierLabels[i], nodes }))
    .filter((t) => t.nodes.length > 0)
}

export type Badge = {
  id: string
  label: string
  description: string
  icon: typeof Award
  earned: boolean
}

export function getBadges(twin: LearningTwin): Badge[] {
  const strongCount = twin.concepts.filter((c) => c.status === 'strong').length
  const improved = twin.baseline && twin.postTest && twin.postTest.score > twin.baseline.score
  return [
    {
      id: 'diagnostic',
      label: 'Baseline Set',
      description: 'Completed the prerequisite diagnostic',
      icon: Target,
      earned: twin.baseline !== null,
    },
    {
      id: 'streak',
      label: 'Streak Keeper',
      description: '7+ day learning streak',
      icon: Flame,
      earned: twin.streak >= 7,
    },
    {
      id: 'level',
      label: 'Rising Scholar',
      description: 'Reached level 5',
      icon: Rocket,
      earned: twin.level >= 5,
    },
    {
      id: 'mastery',
      label: 'Triple Mastery',
      description: '3 concepts marked strong',
      icon: Trophy,
      earned: strongCount >= 3,
    },
    {
      id: 'comeback',
      label: 'Measured Growth',
      description: 'Post-test beat your baseline',
      icon: TrendingUp,
      earned: Boolean(improved),
    },
    {
      id: 'sync',
      label: 'Twin Synced',
      description: 'Twin actively adapting to feedback',
      icon: BrainCircuit,
      earned: twin.updated || twin.baseline !== null,
    },
  ]
}

export const growthIcon = Sparkles
