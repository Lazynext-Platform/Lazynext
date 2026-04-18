import { test, expect } from '@playwright/test'

// E2E coverage for /d/[slug] public decision pages.
//
// What we lock in here:
// 1. Unknown slugs render the 404 page (notFound() path)
// 2. The 404 response is fast — ISSUE-003 regression guard (was 7.6s with
//    placeholder env, fix brought it to <500ms)
// 3. Metadata for unknown slugs resolves cleanly (no server errors during
//    generateMetadata)
// 4. No console errors / page crashes regardless of DB state
//
// What's NOT covered and needs real Supabase creds + a test fixture:
// - Rendering a real public decision with 4-dim breakdown bars
// - OG tags populated from decision content
// - See the skipped test at the bottom for the shape that closes this gap.

test.describe('Public decision page — /d/[slug]', () => {
  test('unknown slug returns 404', async ({ page }) => {
    const response = await page.goto('/d/this-slug-does-not-exist-xyz123')
    expect(response?.status()).toBe(404)
  })

  test('unknown slug responds fast (ISSUE-003 regression)', async ({ page }) => {
    // With placeholder env values, this route used to hang ~7.6s on doomed
    // DNS lookups. After the fix, hasValidDatabaseUrl bails out and
    // getPublicDecision returns null immediately.
    const start = Date.now()
    const response = await page.goto('/d/perf-check-slug', { waitUntil: 'domcontentloaded' })
    const elapsed = Date.now() - start
    expect(response?.status()).toBe(404)
    // Generous ceiling — allows for cold-compile on first request. If this
    // ever exceeds 5s we've regressed the placeholder-env guard.
    expect(elapsed).toBeLessThan(5000)
  })

  test('unknown slug renders without console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message)
    })

    await page.goto('/d/another-missing-slug')

    // Ignore Next.js dev-mode noise + the expected 404 on the primary request.
    // A 404 status on the document itself surfaces as a console error in
    // Chromium but is exactly what we want here.
    const realErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('Download the React DevTools') &&
        !e.toLowerCase().includes('hmr') &&
        !e.toLowerCase().includes('hot update') &&
        !e.includes('404 (Not Found)') &&
        !e.includes('Failed to load resource')
    )
    expect(realErrors).toEqual([])
  })

  test('404 page has a navigable link home', async ({ page }) => {
    await page.goto('/d/missing')
    // Next.js built-in not-found has a "Return Home" link; our custom one
    // (if we ever add it) should at minimum expose a way back to /.
    const links = await page.locator('a[href="/"], a[href^="/"]').count()
    expect(links).toBeGreaterThan(0)
  })

  // SKIPPED — requires a real Supabase connection + a seeded public decision.
  //
  // To close this gap in CI:
  //   1. Add SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL as
  //      secrets pointing at a test Supabase project
  //   2. Seed a decision before the test:
  //        await supabase.from('decisions').insert({
  //          id: 'e2e-test-id',
  //          question: 'Should we add Playwright coverage for /d/[slug]?',
  //          resolution: 'Yes, seed a real decision and hit the page.',
  //          is_public: true,
  //          public_slug: 'e2e-seeded-decision',
  //          quality_score: 85,
  //          score_breakdown: { clarity: 90, data_quality: 80, risk_awareness: 85, alternatives_considered: 85 },
  //          ...
  //        })
  //   3. Unskip the test below and assert the page renders the question,
  //      resolution, and dimension bars.
  test.skip('seeded public decision renders with 4-dim breakdown', async ({ page }) => {
    await page.goto('/d/e2e-seeded-decision')
    await expect(page.locator('h1')).toContainText('Should we add Playwright coverage')
    await expect(page.getByText('Clarity')).toBeVisible()
    await expect(page.getByText('Data quality')).toBeVisible()
    await expect(page.getByText('Risk awareness')).toBeVisible()
    await expect(page.getByText('Alternatives')).toBeVisible()
    // Hero score
    await expect(page.locator('text=/\\b85\\b/')).toBeVisible()
    // OG metadata in <head>
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBeTruthy()
  })
})
