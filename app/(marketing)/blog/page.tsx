'use client'

import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { posts, TAG_COLORS } from './_posts'

// Posts are defined in `_posts/` \u2014 one file per post. Adding a
// post is a single edit there; this page renders the list and
// `[slug]/page.tsx` renders the body. The two stay in sync because
// they read the SAME source-of-truth array.

export default function BlogPage() {
  const featured = posts.find((p) => p.featured)
  const rest = posts.filter((p) => !p.featured)

  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-12">
        <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-600">Blog</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Stories & insights</h1>
        <p className="mt-2 text-lg text-slate-600">Thoughts on decisions, workflows, and building in public.</p>
      </section>

      {/* Featured */}
      {featured && (
        <section className="mx-auto max-w-4xl px-6 pb-12">
          <Link href={`/blog/${featured.slug}`} className="group block rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-8 hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${TAG_COLORS[featured.tag] || 'bg-slate-100 text-slate-500'}`}>{featured.tag}</span>
              <span className="flex items-center gap-1 text-xs text-slate-600"><Clock className="h-3 w-3" /><time dateTime={featured.dateTime}>{featured.date}</time></span>
            </div>
            <h2 className="text-2xl font-bold group-hover:text-indigo-700 transition-colors">{featured.title}</h2>
            <p className="mt-2 text-slate-600 leading-relaxed">{featured.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
              Read more <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>
      )}

      {/* Grid */}
      {rest.length === 0 ? (
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">More posts on the way</p>
            <p className="mt-1 text-xs text-slate-500">
              We&apos;d rather ship one solid post than four placeholders. New writing lands here when it&apos;s actually ready.
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl px-6 pb-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
              <article className="rounded-xl border border-slate-200 bg-white p-5 hover:border-indigo-200 transition-colors h-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${TAG_COLORS[post.tag] || 'bg-slate-100 text-slate-500'}`}>{post.tag}</span>
                </div>
                <h3 className="text-base font-bold group-hover:text-indigo-700 transition-colors">{post.title}</h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                <div className="mt-3 flex items-center justify-between">
                  <time dateTime={post.dateTime} className="text-xs text-slate-600">{post.date}</time>
                  <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Read &rarr;</span>
                </div>
              </article>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
