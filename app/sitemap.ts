import type { MetadataRoute } from 'next'

// Static surface map. Order is reading-order on the marketing nav so it's
// easy to see at a glance what's covered. /blog/[slug] entries are added
// below the static list because they have their own publish dates.
const staticPages = [
  '',
  '/pricing',
  '/about',
  '/features',
  '/comparison',
  '/blog',
  '/changelog',
  '/docs',
  '/careers',
  '/contact',
  '/privacy',
  '/terms',
] as const

// Real, published blog posts. When a new post lands in
// `app/(marketing)/blog/[slug]/page.tsx`, add a line here so it gets
// indexed. We deliberately avoid a glob/manifest scan to keep this file
// dependency-free and the published surface explicit.
const blogPosts = [
  { slug: 'launching-lazynext', publishedAt: new Date('2026-04-18') },
  { slug: 'how-decision-dna-scoring-works', publishedAt: new Date('2026-04-22') },
  { slug: 'workspace-maturity-score', publishedAt: new Date('2026-04-25') },
] as const

// High-priority routes get a higher number so search engines crawl them
// first when they have a budget; everything else lands at 0.7.
const HIGH_PRIORITY: Record<string, number> = {
  '': 1,
  '/pricing': 0.9,
  '/features': 0.8,
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lazynext.com'
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: HIGH_PRIORITY[path] ?? 0.7,
  }))

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map(({ slug, publishedAt }) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: publishedAt,
    changeFrequency: 'yearly',
    priority: 0.6,
  }))

  return [...staticEntries, ...blogEntries]
}
