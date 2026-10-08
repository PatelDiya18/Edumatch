import { Route, ScanSearch, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'

const features = [
  {
    icon: ScanSearch,
    title: 'AI Resource Curation',
    body: 'Describe what you are stuck on in plain language. LearnTwin parses intent, level, and goal, then surfaces only the resources that fit how you learn.',
  },
  {
    icon: Sparkles,
    title: 'The Learning Twin',
    body: 'A dynamic model of your understanding, retention, application, confidence, and weak spots that updates with every session and piece of feedback.',
  },
  {
    icon: Route,
    title: 'Adaptive Learning Path',
    body: 'Your plan re-sequences itself as your twin evolves, prioritizing revision-due concepts and closing weak areas before they cost you an exam.',
  },
]

export function LandingFeatures() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="mb-10 flex flex-col gap-3 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Three systems, one adaptive loop
        </h2>
        <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">
          Everything in LearnTwin feeds the twin, and the twin feeds everything back to you.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="flex flex-col gap-4 p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <feature.icon className="size-5" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
