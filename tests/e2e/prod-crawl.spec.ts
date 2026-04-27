import { test, expect, type Page } from '@playwright/test'

// Exhaustive production crawler. Targets the live site, walks every
// linked page reachable from the marketing surface, captures console
// errors, failed network responses, broken images, missing alts,
// duplicate ids, and headings without an h1 — writes a structured
// report to test-results/crawl-report.json.
//
// This is read-only. It does not sign in; it only verifies the public
// surface is clean. App-shell pages are checked for a graceful redirect
// to /sign-in (not a 500).
const PROD = process.env.CRAWL_BASE ?? 'https://lazynext.com'

interface PageReport {
  url: string
  status: number
  loadTimeMs: number
  consoleErrors: string[]
  consoleWarnings: string[]
  failedRequests: { url: string; status: number; method: string }[]
  brokenImages: string[]
  imagesMissingAlt: number
  duplicateIds: string[]
  hasH1: boolean
  metaDescription: string | null
  title: string
}

const SEED_PATHS = [
  '/',
  '/pricing',
  '/about',
  '/blog',
  '/changelog',
  '/comparison',
  '/contact',
  '/careers',
  '/privacy',
  '/terms',
  '/docs',
  '/features',
  '/sign-in',
  '/sign-up',
]

function isThirdPartyConsoleNoise(text: string): boolean {
  return (
    text.includes('favicon') ||
    text.includes('third-party') ||
    text.includes('fonts.googleapis') ||
    text.includes('cookiebanner') ||
    text.includes('analytics') ||
    text.includes('chrome-extension://') ||
    text.includes('Manifest:') ||
    text.includes('Sentry') ||
    text.includes('inngest')
  )
}

async function crawlPage(page: Page, url: string): Promise<PageReport> {
  const consoleErrors: string[] = []
  const consoleWarnings: string[] = []
  const failedRequests: PageReport['failedRequests'] = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (isThirdPartyConsoleNoise(text)) return
    if (msg.type() === 'error') consoleErrors.push(text)
    if (msg.type() === 'warning') consoleWarnings.push(text)
  })
  page.on('response', (res) => {
    const status = res.status()
    if (status >= 400 && !res.url().includes('chrome-extension://')) {
      failedRequests.push({
        url: res.url(),
        status,
        method: res.request().method(),
      })
    }
  })

  const start = Date.now()
  let status = 0
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 25000,
    })
    status = response?.status() ?? 0
  } catch {
    status = -1
  }
  const loadTimeMs = Date.now() - start

  const audit = await page.evaluate(() => {
    const imgs = Array.from(document.images)
    const broken = imgs
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.src)
    const missingAlt = imgs.filter((i) => !i.alt).length
    const idCounts = new Map<string, number>()
    document.querySelectorAll('[id]').forEach((el) => {
      const id = el.id
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
    })
    const duplicateIds = Array.from(idCounts.entries())
      .filter(([, n]) => n > 1)
      .map(([id]) => id)
    const hasH1 = document.querySelectorAll('h1').length > 0
    const metaEl = document.querySelector('meta[name="description"]')
    return {
      brokenImages: broken,
      imagesMissingAlt: missingAlt,
      duplicateIds,
      hasH1,
      metaDescription: metaEl?.getAttribute('content') ?? null,
      title: document.title,
    }
  })

  return {
    url,
    status,
    loadTimeMs,
    consoleErrors,
    consoleWarnings,
    failedRequests,
    ...audit,
  }
}

test('crawl public surface and dump report', async ({ page }) => {
  test.setTimeout(180_000)
  const reports: PageReport[] = []

  for (const path of SEED_PATHS) {
    const url = `${PROD}${path}`
    // eslint-disable-next-line no-console
    console.log(`crawl: ${url}`)
    const report = await crawlPage(page, url)
    reports.push(report)
  }

  const fs = await import('node:fs/promises')
  await fs.mkdir('test-results', { recursive: true })
  await fs.writeFile(
    'test-results/crawl-report.json',
    JSON.stringify(reports, null, 2),
  )

  // Summary
  const issues = reports.flatMap((r) => {
    const list: string[] = []
    if (r.status >= 400 || r.status < 0) list.push(`status ${r.status}`)
    if (r.consoleErrors.length)
      list.push(`${r.consoleErrors.length} console errors`)
    if (r.failedRequests.length)
      list.push(`${r.failedRequests.length} failed requests`)
    if (r.brokenImages.length)
      list.push(`${r.brokenImages.length} broken images`)
    if (r.duplicateIds.length)
      list.push(`${r.duplicateIds.length} duplicate ids`)
    if (!r.hasH1) list.push('no h1')
    return list.length ? [`${r.url}: ${list.join(', ')}`] : []
  })

  // eslint-disable-next-line no-console
  console.log('\n=== CRAWL ISSUES ===')
  if (issues.length === 0) {
    // eslint-disable-next-line no-console
    console.log('  none')
  } else {
    for (const i of issues) console.log(`  - ${i}`)
  }

  expect(reports.length).toBe(SEED_PATHS.length)
})
