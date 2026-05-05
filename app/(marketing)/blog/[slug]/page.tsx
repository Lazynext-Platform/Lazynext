import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import { getAllSlugs, getPostBySlug, TAG_COLORS } from '../_posts'

// Body content for every post lives in `../_posts/<slug>.ts`.
// This page is a pure render of whichever post the slug resolves
// to; static params are derived from the same source.

export const dynamicParams = false

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: 'Post not found' }
  return {
    title: `${post.title} | Lazynext Blog`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.dateTime },
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  return (
    <main id="main-content" className="bg-white text-slate-900">
      <article className="mx-auto max-w-3xl px-6 pt-24 pb-24">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>

        <header className="mt-6">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${TAG_COLORS[post.tag] || 'bg-slate-100 text-slate-500'}`}>{post.tag}</span>
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Clock className="h-3 w-3" />
              <time dateTime={post.dateTime}>{post.date}</time>
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>
          <p className="mt-3 text-lg text-slate-600 leading-relaxed">{post.excerpt}</p>
        </header>

        <div className="mt-10 space-y-5 text-slate-700 leading-relaxed">
          {post.content.map((block, i) => {
            if (block.type === 'h2') return <h2 key={i} className="text-2xl font-bold text-slate-900 pt-4">{block.text}</h2>
            if (block.type === 'h3') return <h3 key={i} className="text-lg font-bold text-slate-900 pt-2">{block.text}</h3>
            if (block.type === 'ul') return (
              <ul key={i} className="list-disc pl-6 space-y-2">
                {block.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            )
            if (block.type === 'code') return (
              <pre key={i} className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono text-slate-800">
                <code>{block.text}</code>
              </pre>
            )
            if (block.type === 'blockquote') return <blockquote key={i} className="border-l-4 border-indigo-200 pl-4 italic text-slate-600">{block.text}</blockquote>
            return <p key={i}>{block.text}</p>
          })}
        </div>

        <footer className="mt-16 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-6">
          <h3 className="text-lg font-bold">Start measuring your team&rsquo;s judgment.</h3>
          <p className="mt-1 text-sm text-slate-600">If your team makes a lot of decisions and has no way to know if it&rsquo;s getting better at them, we want to talk.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Get started</Link>
            <Link href="/contact" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-200">Contact us</Link>
          </div>
        </footer>
      </article>
    </main>
  )
}
