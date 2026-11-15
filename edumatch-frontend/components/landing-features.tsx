import { BookOpen, Compass, Target } from 'lucide-react'

const features = [
  {
    icon: Target,
    title: 'Understand Your Starting Point',
    body: 'Take a quick diagnostic to discover what you already know and where you need help.',
  },
  {
    icon: BookOpen,
    title: 'Learn What Matters',
    body: 'Get learning resources selected around your knowledge level, interests and goals.',
  },
  {
    icon: Compass,
    title: "Always Know What's Next",
    body: 'See which topics need attention and get clear guidance on what to learn or practice next.',
  },
]

export function LandingFeatures() {
  return (
    <section className="bg-background ...">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-3 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            A smarter way to learn
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-slate-400">
            Everything you need to make your learning more focused, personal and effective.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-indigo-500/60"
            >
              <span className="grid size-11 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-400">
                <feature.icon className="size-5" />
              </span>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
