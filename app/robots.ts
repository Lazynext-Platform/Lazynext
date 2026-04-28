import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lazynext.com'

  return {
    rules: [
      {
        userAgent: '*',
        // The `allow` rules win over `disallow` for more-specific paths,
        // so the public OpenAPI spec under /api/ is crawlable while the
        // rest of /api/ stays blocked.
        allow: ['/', '/api/v1/openapi.json'],
        disallow: ['/workspace/', '/onboarding/', '/api/', '/auth/', '/shared/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
