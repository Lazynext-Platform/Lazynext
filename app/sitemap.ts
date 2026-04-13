import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lazynext.com'
  const now = new Date()

  const staticPages = [
    '',
    '/about',
    '/blog',
    '/changelog',
    '/comparison',
    '/features',
    '/pricing',
  ]

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly' as const,
    priority: path === '' ? 1 : path === '/pricing' ? 0.9 : 0.7,
  }))
}
