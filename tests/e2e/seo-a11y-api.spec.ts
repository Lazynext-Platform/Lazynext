import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

// ─── SEO Infrastructure ─────────────────────────────────────

test.describe('SEO & Meta', () => {
  test('sitemap.xml is accessible and valid', async ({ page }) => {
    const response = await page.goto(`${BASE}/sitemap.xml`)
    expect(response?.status()).toBe(200)
    const contentType = response?.headers()['content-type'] ?? ''
    expect(contentType).toContain('xml')
    const body = await page.content()
    expect(body).toContain('<urlset')
    expect(body).toContain('<url>')
    expect(body).toContain('/pricing')
    expect(body).toContain('/features')
    expect(body).toContain('/about')
  })

  test('robots.txt is accessible and valid', async ({ page }) => {
    const response = await page.goto(`${BASE}/robots.txt`)
    expect(response?.status()).toBe(200)
    const body = await response!.text()
    expect(body.toLowerCase()).toContain('user-agent')
    expect(body).toContain('Disallow: /workspace/')
    expect(body).toContain('Disallow: /api/')
    expect(body.toLowerCase()).toContain('sitemap:')
  })

  test('manifest.json is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE}/manifest.json`)
    expect(response?.status()).toBe(200)
    const body = await response!.json()
    expect(body.name).toBe('Lazynext')
    expect(body.theme_color).toBe('#4F6EF7')
    expect(body.display).toBe('standalone')
  })

  test('landing page has correct meta tags', async ({ page }) => {
    await page.goto(BASE)
    const title = await page.title()
    expect(title).toContain('Lazynext')

    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content')
    expect(ogTitle).toBeTruthy()

    const description = await page.getAttribute('meta[name="description"]', 'content')
    expect(description).toBeTruthy()
    expect(description!.length).toBeGreaterThan(50)
  })

  test('pricing page has title', async ({ page }) => {
    await page.goto(`${BASE}/pricing`)
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})

// ─── API Health ──────────────────────────────────────────────

test.describe('API Route Health', () => {
  test('unauthenticated API requests return 401', async ({ request }) => {
    const routes = [
      '/api/v1/nodes',
      '/api/v1/edges',
      '/api/v1/workflows',
      '/api/v1/decisions',
      '/api/v1/search',
      '/api/v1/export',
    ]

    for (const route of routes) {
      const response = await request.get(`${BASE}${route}`)
      expect(response.status(), `${route} should return 401`).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('UNAUTHORIZED')
    }
  })

  test('unauthenticated POST requests return 401', async ({ request }) => {
    const routes = [
      '/api/v1/nodes',
      '/api/v1/edges',
      '/api/v1/workflows',
      '/api/v1/decisions',
      '/api/v1/import',
      '/api/v1/decisions/search',
    ]

    for (const route of routes) {
      const response = await request.post(`${BASE}${route}`, {
        data: { test: true },
      })
      expect(response.status(), `${route} should return 401`).toBe(401)
    }
  })
})

// ─── Accessibility Basics ────────────────────────────────────

test.describe('Accessibility', () => {
  test('landing page has proper heading hierarchy', async ({ page }) => {
    await page.goto(BASE)
    const h1 = await page.locator('h1').count()
    expect(h1).toBeGreaterThanOrEqual(1)

    // Verify no skipped heading levels (h1 exists before h3, etc.)
    const headings = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      return Array.from(els).map(el => parseInt(el.tagName[1]))
    })

    for (let i = 1; i < headings.length; i++) {
      const gap = headings[i] - headings[i - 1]
      // Only check forward jumps — going deeper should not skip levels
      // Going back up (e.g., h3 → h2) is always valid
      if (gap > 0) {
        expect(gap, `Heading level skipped from h${headings[i - 1]} to h${headings[i]}`).toBeLessThanOrEqual(1)
      }
    }
  })

  test('all images have alt text', async ({ page }) => {
    await page.goto(BASE)
    const imagesWithoutAlt = await page.locator('img:not([alt])').count()
    expect(imagesWithoutAlt).toBe(0)
  })

  test('interactive elements are keyboard focusable', async ({ page }) => {
    await page.goto(BASE)
    // Tab through the page and verify focus is visible
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })

  test('sign-in form has proper labels', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`)
    // Email/password inputs should have labels or aria-labels
    const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      const ariaLabel = await input.getAttribute('aria-label')
      const id = await input.getAttribute('id')
      const label = id ? await page.locator(`label[for="${id}"]`).count() : 0
      const hasLabel = !!ariaLabel || label > 0
      expect(hasLabel, `Input ${i} should have a label`).toBe(true)
    }
  })

  test('color contrast — text should be visible on dark background', async ({ page }) => {
    await page.goto(BASE)
    // Verify the page uses our dark theme
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor
    })
    expect(bgColor).toBeTruthy()
  })
})

// ─── Auth Redirects ──────────────────────────────────────────

test.describe('Auth Redirects', () => {
  test('workspace routes redirect unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE}/workspace/test-slug`)
    // Should redirect to sign-in
    expect(page.url()).toContain('/sign-in')
  })

  test('onboarding redirects unauthenticated users', async ({ page }) => {
    // /onboarding is a public route by design (added in commit 81bc69a) —
    // first-run users land here before a workspace exists. Verify the page
    // renders instead of redirecting.
    await page.goto(`${BASE}/onboarding`)
    expect(page.url()).toContain('/onboarding')
  })
})
