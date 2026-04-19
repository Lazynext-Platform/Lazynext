import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// E2E coverage for /d/[slug] public decision pages.
//
// What we lock in here:
// 1. Unknown slugs render the 404 page (notFound() path)
// 2. The 404 response is fast — ISSUE-003 regression guard (was 7.6s with
//    placeholder env, fix brought it to <500ms)
// 3. Metadata for unknown slugs resolves cleanly (no server errors during
//    generateMetadata)
// 4. No console errors / page crashes regardless of DB state
// 5. A seeded real public decision renders with 4-dim breakdown + OG metadata
//    (gated on SUPABASE_SERVICE_ROLE_KEY being available — skips locally
//    without creds, runs in CI when secrets are wired up)

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

  // Seeded public-decision test.
  //
  // Runs when SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL are
  // present (CI with test Supabase, or local dev with service role).
  // Skips cleanly otherwise so unconfigured machines still pass.
  //
  // The seed + cleanup happens per-test — no shared fixtures, safe to run
  // in parallel with other specs (unique slug, isolated workspace).
  const hasSupabaseCreds =
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

  test('seeded public decision renders with 4-dim breakdown', async ({ page }) => {
    test.skip(!hasSupabaseCreds, 'Supabase service role creds not configured')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const slug = `e2e-seeded-${Date.now()}`
    const question = `E2E seed: should we add Playwright coverage for /d/[slug]? (${slug})`

    // Reuse the first existing workspace+user so we don't need to provision
    // auth.users rows from a test. If the DB is empty, the test skips.
    const { data: ws } = await supabase.from('workspaces').select('id, created_by').limit(1).maybeSingle()
    test.skip(!ws, 'No workspace in test DB to anchor seeded decision')

    const { data: seeded, error: seedError } = await supabase
      .from('decisions')
      .insert({
        workspace_id: ws!.id,
        question,
        resolution: 'Yes — seed a real decision and hit the page.',
        rationale: 'Needed E2E coverage for the public share surface.',
        status: 'decided',
        outcome: 'pending',
        quality_score: 85,
        score_breakdown: {
          clarity: 90,
          data_quality: 80,
          risk_awareness: 85,
          alternatives_considered: 85,
        },
        is_public: true,
        public_slug: slug,
        made_by: ws!.created_by,
      })
      .select()
      .single()

    expect(seedError).toBeNull()
    expect(seeded).toBeTruthy()

    try {
      await page.goto(`/d/${slug}`)
      await expect(page.locator('h1')).toContainText('E2E seed')
      await expect(page.getByText('Clarity')).toBeVisible()
      await expect(page.getByText('Data quality')).toBeVisible()
      await expect(page.getByText('Risk awareness')).toBeVisible()
      await expect(page.getByText('Alternatives')).toBeVisible()
      // Hero score
      await expect(page.locator('text=/\\b85\\b/').first()).toBeVisible()
      // OG metadata in <head>
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
      expect(ogTitle).toBeTruthy()
    } finally {
      // Cleanup — don't leak seeded rows across runs
      await supabase.from('decisions').delete().eq('id', seeded!.id)
    }
  })
})
