import { Star } from 'lucide-react'

const testimonials = [
  {
    quote:
      'We killed 5 subscriptions in one week. Decision DNA alone is worth the switch — we finally know why we made the choices we did.',
    name: 'Priya Raghavan',
    title: 'Head of Product, FlowStack',
    initials: 'PR',
  },
  {
    quote:
      "LazyMind is scary good. I asked it what decisions were blocking our launch and it gave me a perfectly prioritized list with context I'd forgotten.",
    name: 'Arjun Krishnamurthy',
    title: 'CTO, NexaBuild',
    initials: 'AK',
  },
  {
    quote:
      "My team went from 4 tabs to 1. Our Monday planning went from 45 minutes to 12 minutes. I'm not exaggerating — we timed it.",
    name: 'Sara Mehta',
    title: 'Engineering Manager, DevCraft',
    initials: 'SM',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Loved by teams who{' '}
            <span className="text-brand">ship</span>
          </h2>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="card-hover rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-500">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t.name}
                  </p>
                  <p className="text-xs text-slate-400">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
