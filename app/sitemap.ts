import type { MetadataRoute } from 'next'
import { posts as blogPostList } from './(marketing)/blog/_posts'

// Static surface map. Order is reading-order on the marketing nav so it's
// easy to see at a glance what's covered. /blog/[slug] entries are derived
// from the same `_posts` registry the blog pages render from, so adding a
// post in one place updates the sitemap automatically.
const staticPages = [
  '',
  '/pricing',
  '/about',
  '/features',
  '/comparison',
  '/blog',
  '/changelog',
  '/docs',
  '/docs/api',
  '/docs/api/quickstart',
  '/docs/api/authentication',
  '/docs/api/rate-limits',
  '/docs/api/webhooks',
  '/docs/api/versioning',
  '/docs/api/changelog',
  '/careers',
  '/contact',
  '/privacy',
  '/terms',
] as const

// Real, published blog posts. The single source of truth is the
// `_posts/` registry; we just project slug + publish date here.
const blogPosts = blogPostList.map((p) => ({
  slug: p.slug,
  publishedAt: new Date(p.dateTime),
}))

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
