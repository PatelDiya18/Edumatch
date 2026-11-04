'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Sparkles, ArrowRight, Check, BookOpen, Type, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createProfile, generateDiagnosticQuestions, getCurrentUser } from '@/lib/api'

interface TopicOption {
  id: string
  label: string
  category: string
  icon: string
}

const SUGGESTED_TOPICS: TopicOption[] = [
  { id: 'dsa', label: 'Data Structures & Algorithms', category: 'CS', icon: '💻' },
  { id: 'ml', label: 'Machine Learning', category: 'AI', icon: '🧠' },
  { id: 'dbms', label: 'Database Management Systems', category: 'CS', icon: '🗄️' },
  { id: 'webdev', label: 'Full-Stack Web Development', category: 'Dev', icon: '🌐' },
  { id: 'os', label: 'Operating Systems', category: 'CS', icon: '⚙️' },
  { id: 'math', label: 'Linear Algebra & Statistics', category: 'Math', icon: '📊' },
  { id: 'networks', label: 'Computer Networks', category: 'CS', icon: '📡' },
  { id: 'chem', label: 'Organic Chemistry', category: 'Science', icon: '🧪' },
]

const LEARNING_FORMATS = [
  { id: 'visual', title: 'Visual', desc: 'Diagrams, videos, animations', icon: BookOpen },
  { id: 'text', title: 'Text', desc: 'Articles, notes, references', icon: Type },
  { id: 'interactive', title: 'Interactive', desc: 'Practice, quizzes, sandboxes', icon: MousePointerClick },
]

const GOAL_OPTIONS = [
  'Pass an exam',
  'Build a project',
  'Interview prep',
  'Just curious'
]

export default function OnboardingPage() {
  const router = useRouter()

  // State variables
  const [userName, setUserName] = useState<string>('')
  const [loadingUser, setLoadingUser] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Form selections
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>('text')
  const [customGoal, setCustomGoal] = useState<string>('')
  const [selectedGoalTag, setSelectedGoalTag] = useState<string>('')
  const [step, setStep] = useState<number>(1)

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoadingUser(true)
        const user = await getCurrentUser()
        setUserName(`${user.first_name} ${user.last_name}`.trim())
      } catch {
        router.replace('/auth')
      } finally {
        setLoadingUser(false)
      }
    }

    fetchUserData()
  }, [router])
  // Handle Step 1 topic click
  const handleSelectTopic = (topicLabel: string) => {
    setSelectedTopic((prev) => (prev === topicLabel ? '' : topicLabel))
  }
  const selectTopic = (topicId: string) => {
    setSelectedTopic((prev) => (prev === topicId ? null : topicId))
  }

  const filteredTopics = SUGGESTED_TOPICS.filter((t) =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Step logic: On completion of step 3 -> Route to /quiz
  // Handle Step transitions & final submission payload linking
  const handleNextStep = async () => {
    if (step === 1) {
      const finalTopic = selectedTopic || searchQuery.trim()
      if (!finalTopic) return
      setSelectedTopic(finalTopic) // Ensure state captures search input if typed manually
      setStep(2)
    } else if (step === 2) {
      if (!selectedFormat) return
      setStep(3)
    } else if (step === 3) {
      const finalGoal = customGoal.trim()
      const finalTopic = selectedTopic?.trim()
      if (!finalGoal || !finalTopic) return

      try {
        setIsSubmitting(true)
        setSubmitError(null)

        const profile = await createProfile({
          name: userName.trim() || 'Learner',
          topic: finalTopic,
          preferred_format: selectedFormat as 'visual' | 'interactive' | 'text',
          goal: finalGoal,
        })

        await generateDiagnosticQuestions(profile.profile_id)
        router.push(`/quiz?profile_id=${profile.profile_id}`)
      } catch (error) {
        console.error('Error saving onboarding data:', error)
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Unable to prepare your diagnostic. Please try again.',
        )
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-8">

        {/* Step Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Step {step} of 3</span>
            <span>{step === 1 ? '33%' : step === 2 ? '66%' : '100%'} Completed</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: TOPIC SELECTION */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {loadingUser ? 'Welcome! 👋' : userName ? `Welcome, ${userName}! 👋` : 'Welcome! 👋'}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                What concept or subject do you want to master first with LearnTwin?
              </p>
            </div>

            <div className="space-y-5 bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search topics (e.g. Data Structures, Neural Networks)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSelectedTopic(e.target.value) // Link manual typing directly to topic state
                  }}
                  className="w-full pl-10 pr-4 h-11 rounded-xl text-base bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> Select One Topic
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTED_TOPICS.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase())).map((topic) => {
                    const isSelected = selectedTopic === topic.label
                    return (
                      <button
                        key={topic.id}
                        onClick={() => {
                          handleSelectTopic(topic.label)
                          setSearchQuery(topic.label) // Sync selection with search query view
                        }}
                        type="button"
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]'
                            : 'bg-secondary/50 hover:bg-secondary border-border text-foreground'
                        }`}
                      >
                        <span>{topic.icon}</span>
                        <span>{topic.label}</span>
                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {selectedTopic ? '1 topic selected' : 'Select 1 topic to continue'}
              </p>
              <Button
                size="lg"
                onClick={handleNextStep}
                disabled={!selectedTopic}
                className="h-11 px-6 rounded-xl text-base gap-2"
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: LEARNING PREFERENCES */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                How do you learn best? 🎯
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Your twin starts with this format and re-tunes it from your feedback.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LEARNING_FORMATS.map((fmt) => {
                const IconComponent = fmt.icon
                const isSelected = selectedFormat === fmt.id
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)} // Links selection as preferred_format
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-secondary w-fit">
                      <IconComponent className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{fmt.title}</h3>
                      <p className="text-xs text-muted-foreground">{fmt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button size="lg" onClick={handleNextStep} className="h-11 px-6 rounded-xl text-base gap-2">
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: GOAL SETTING */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                What's the goal? 🚀
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                This anchors how your learning path is sequenced.
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="e.g. Ace my DSA midterm in three weeks"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)} // Links custom or tag input as goal
                className="w-full px-4 h-12 rounded-xl text-base bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="flex flex-wrap gap-2 pt-1">
                {GOAL_OPTIONS.map((goalTag) => (
                  <button
                    key={goalTag}
                    type="button"
                    onClick={() => setCustomGoal(goalTag)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      customGoal === goalTag
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {goalTag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                size="lg"
                onClick={handleNextStep}
                disabled={!customGoal.trim() || isSubmitting}
                className="h-11 px-6 rounded-xl text-base gap-2"
              >
                {isSubmitting ? 'Starting Quiz...' : 'Start Diagnostic'}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>
    </main>
  )
}