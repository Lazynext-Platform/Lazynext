'use client'

import { ArrowRight, Clock } from 'lucide-react'

const posts = [
  { slug: 'decision-dna', title: 'Introducing Decision DNA', excerpt: 'How AI-scored decisions help teams learn from every choice.', date: 'April 2, 2026', tag: 'Product', featured: true },
  { slug: 'graph-native', title: 'Why Graph-Native Workflows?', excerpt: 'Tasks in a list are easy. But work is messy — it branches, loops, and connects. Here\'s how a canvas changes everything.', date: 'March 20, 2026', tag: 'Engineering', featured: false },
  { slug: 'global-first', title: 'Why We\'re Building Global-First', excerpt: '$9/seat, transparent pricing, and global infrastructure — our thesis on building for today\'s startup ecosystem.', date: 'March 10, 2026', tag: 'Company', featured: false },
  { slug: 'launch', title: 'Lazynext is Live', excerpt: 'After 3 months of building, Lazynext v0.1 is here. Here\'s what we shipped and what\'s next.', date: 'February 20, 2026', tag: 'Launch', featured: false },
]

const tagColors: Record<string, string> = {
  Product: 'bg-indigo-100 text-indigo-700',
  Engineering: 'bg-emerald-100 text-emerald-700',
  Company: 'bg-amber-100 text-amber-700',
  Launch: 'bg-pink-100 text-pink-700',
}

export default function BlogPage() {
  const featured = posts.find(p => p.featured)
  const rest = posts.filter(p => !p.featured)

  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12">
        <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">Blog</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Stories & insights</h1>
        <p className="mt-2 text-lg text-slate-600">Thoughts on decisions, workflows, and building in public.</p>
      </section>

      {/* Featured */}
      {featured && (
        <section className="mx-auto max-w-4xl px-6 pb-12">
          <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-8 hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${tagColors[featured.tag] || 'bg-slate-100 text-slate-500'}`}>{featured.tag}</span>
              <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" />{featured.date}</span>
            </div>
            <h2 className="text-2xl font-bold group-hover:text-indigo-700 transition-colors">{featured.title}</h2>
            <p className="mt-2 text-slate-600 leading-relaxed">{featured.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
              Read more <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="mx-auto max-w-4xl px-6 pb-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map(post => (
          <article key={post.slug} className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${tagColors[post.tag] || 'bg-slate-100 text-slate-500'}`}>{post.tag}</span>
            </div>
            <h3 className="text-base font-bold group-hover:text-indigo-700 transition-colors">{post.title}</h3>
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">{post.date}</span>
              <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Read →</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
