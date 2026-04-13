import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lazynext.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/workspace/', '/onboarding/', '/api/', '/auth/', '/shared/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
