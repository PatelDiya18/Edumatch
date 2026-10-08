'use client'

import { useMemo, useState } from 'react'
import { Loader2, Search, Sparkles, Target, TrendingUp, Wand2 } from 'lucide-react'
import { Chip } from '@/components/chip'
import { ResourceCard } from '@/components/resource-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLearnTwin, type LearningMode } from '@/lib/learn-twin'
import { getRecommendedResources } from '@/lib/resources'

const suggestions = [
  'I keep getting lost in recursive problems',
  'Help me prep for my DP interview questions',
  'Revise linked lists before my quiz',
  'Explain hash maps visually',
]

type Parsed = {
  intent: string
  level: string
  format: LearningMode
  concept: string
}

function normalizeLearningMode(value: string): LearningMode {
  switch (value.toLowerCase()) {
    case 'visual':
      return 'Visual'
    case 'interactive':
      return 'Interactive'
    case 'text':
      return 'Text'
    default:
      return 'Text'
  }
}

async function parseQuery(query: string, preference: LearningMode): Promise<Parsed> {
  const q = query.toLowerCase()
  const request = await getRecommendedResources(42);
  const conceptMatch=request.resources.find((r) => q.includes(r.title))
  const concept = conceptMatch?.title ?? 'Recursion'
  const level = /interview|advanced|hard/.test(q)
    ? 'Advanced'
    : /basic|beginner|start|lost|confus/.test(q)
      ? 'Beginner'
      : 'Intermediate'
  const format: LearningMode = /visual|diagram|video|see/.test(q)
    ? 'Visual'
    : /practice|interactive|quiz|hands/.test(q)
      ? 'Interactive'
      : /read|article|text|notes/.test(q)
        ? 'Text'
        : preference
  const intent = /revis|review/.test(q)
    ? 'Revision'
    : /prep|exam|interview|quiz/.test(q)
      ? 'Exam prep'
      : 'Learn a new concept'
  return { intent, level, format, concept }
}

export function SearchExperience() {
  const { twin, applyFeedback } = useLearnTwin()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  type Resource = Awaited<ReturnType<typeof getRecommendedResources>>['resources'][number]
  const [resources, setResources] = useState<Resource[]>([])

  const results = useMemo(() => {
    if (!parsed) return []

    const getConcept = (r: Resource) =>
      'concept' in r && typeof r.concept === 'string' ? r.concept : r.title

    return [...resources]
      .map((r) => {
        const concept = getConcept(r)
        let score = 0
        if (concept === parsed.concept) score += 5
        if (normalizeLearningMode(r.format) === parsed.format) score += 3
        if (twin.weakAreas.includes(concept)) score += 2
        if ('difficulty' in r && typeof r.difficulty === 'string' && r.difficulty === parsed.level) {
          score += 1
        }
        return { r, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.r)
  }, [parsed, resources, twin.weakAreas])

  const runSearch = async (value: string) => {
    if (!value.trim()) return
    setLoading(true)
    setParsed(null)
    try {
      const nextParsed = await parseQuery(value, twin.preference)
      const response = await getRecommendedResources(42)
      setParsed(nextParsed)
      setResources([...response.resources])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
          Ask in plain language
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Describe what you&apos;re stuck on. LearnTwin reads your intent, level, and goal, then
          curates resources tuned to your twin.
        </p>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          runSearch(query)
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. I don't get how recursion actually returns values"
              className="h-13 w-full rounded-xl border border-input bg-card py-3.5 pl-12 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>
          <Button type="submit" size="lg" className="h-13 rounded-xl px-6 text-base" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            Curate
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuery(s)
                runSearch(s)
              }}
            >
              <Chip tone="outline" className="cursor-pointer hover:bg-muted">
                {s}
              </Chip>
            </button>
          ))}
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Reading your twin and curating resources...
        </div>
      ) : null}

      {parsed && !loading ? (
        <div className="flex flex-col gap-6">
          <Card className="border-primary/30 bg-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Here&apos;s how I read that
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <IntentTag icon={Target} label="Intent" value={parsed.intent} />
              <IntentTag icon={TrendingUp} label="Level" value={parsed.level} />
              <IntentTag icon={Sparkles} label="Format" value={parsed.format} />
              <IntentTag icon={Search} label="Concept" value={parsed.concept} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {results.length} curated for you
            </h2>
            <Chip tone="primary">Matched to your {twin.preference} style</Chip>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {results.map((resource) => (
              <ResourceCard
                key={resource.title}
                resource={resource}
                showReason
                onFeedback={(helpful) => applyFeedback(helpful, normalizeLearningMode(resource.format))}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function IntentTag({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <div className="leading-tight">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
