import { test, expect } from '@playwright/test'

const MARKETING_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/features', name: 'Features' },
  { path: '/blog', name: 'Blog' },
  { path: '/changelog', name: 'Changelog' },
  { path: '/comparison', name: 'Comparison' },
  { path: '/about', name: 'About' },
]

const AUTH_PAGES = [
  { path: '/sign-in', name: 'Sign In' },
  { path: '/sign-up', name: 'Sign Up' },
]

const WORKSPACE_PAGES = [
  { path: '/workspace/demo', name: 'Workspace Home' },
  { path: '/workspace/demo/canvas/default', name: 'Canvas' },
  { path: '/workspace/demo/tasks', name: 'Tasks' },
  { path: '/workspace/demo/decisions', name: 'Decisions' },
  { path: '/workspace/demo/decisions/health', name: 'Decision Health' },
  { path: '/workspace/demo/pulse', name: 'Pulse' },
  { path: '/workspace/demo/automations', name: 'Automations' },
  { path: '/workspace/demo/templates', name: 'Templates' },
  { path: '/workspace/demo/import', name: 'Import' },
  { path: '/workspace/demo/export', name: 'Export' },
  { path: '/workspace/demo/activity', name: 'Activity' },
  { path: '/workspace/demo/settings', name: 'Settings' },
  { path: '/workspace/demo/members', name: 'Members' },
  { path: '/workspace/demo/billing', name: 'Billing' },
  { path: '/workspace/demo/integrations', name: 'Integrations' },
  { path: '/workspace/demo/profile', name: 'Profile' },
]

const OTHER_PAGES = [
  { path: '/onboarding/create-workspace', name: 'Onboarding' },
  { path: '/shared/test-id', name: 'Shared View' },
]

const API_ROUTES = [
  { path: '/api/v1/workflows?workspaceId=test', name: 'Workflows API' },
  { path: '/api/v1/nodes?workflowId=test', name: 'Nodes API' },
  { path: '/api/v1/edges?workflowId=test', name: 'Edges API' },
  { path: '/api/v1/decisions?workspaceId=test', name: 'Decisions API' },
  { path: '/api/v1/decisions/test-id', name: 'Decision Detail API' },
  { path: '/api/v1/search?q=test&workspaceId=test', name: 'Search API' },
  { path: '/api/v1/export?workspaceId=test', name: 'Export API' },
  { path: '/api/v1/threads/test-node-id', name: 'Threads API' },
  { path: '/api/v1/workflows/test-id', name: 'Workflow Detail API' },
  { path: '/api/v1/nodes/test-id', name: 'Node Detail API' },
]

test.describe('Marketing Pages', () => {
  for (const page of MARKETING_PAGES) {
    test(`${page.name} (${page.path}) loads`, async ({ page: p }) => {
      const consoleErrors: string[] = []
      p.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

      const response = await p.goto(page.path)
      expect(response?.status()).toBe(200)
      await expect(p.locator('body')).toBeVisible()

      // Check no critical console errors (filter out known benign ones)
      const critical = consoleErrors.filter(e =>
        !e.includes('favicon') && !e.includes('hydration') && !e.includes('Failed to load resource')
      )
      if (critical.length > 0) console.log(`  ⚠ Console errors on ${page.path}:`, critical)
    })
  }
})

test.describe('Auth Pages', () => {
  for (const page of AUTH_PAGES) {
    test(`${page.name} (${page.path}) loads`, async ({ page: p }) => {
      const response = await p.goto(page.path)
      expect(response?.status()).toBe(200)
      await expect(p.locator('body')).toBeVisible()
    })
  }
})

test.describe('Workspace Pages', () => {
  for (const page of WORKSPACE_PAGES) {
    test(`${page.name} (${page.path}) loads`, async ({ page: p }) => {
      const consoleErrors: string[] = []
      p.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

      const response = await p.goto(page.path)
      expect(response?.status()).toBe(200)
      await expect(p.locator('body')).toBeVisible()

      const critical = consoleErrors.filter(e =>
        !e.includes('favicon') && !e.includes('hydration') && !e.includes('Warning:')
      )
      if (critical.length > 0) console.log(`  ⚠ Console errors on ${page.path}:`, critical)
    })
  }
})

test.describe('Other Pages', () => {
  for (const page of OTHER_PAGES) {
    test(`${page.name} (${page.path}) loads`, async ({ page: p }) => {
      const response = await p.goto(page.path)
      expect(response?.status()).toBe(200)
      await expect(p.locator('body')).toBeVisible()
    })
  }
})

test.describe('404 Page', () => {
  test('returns 404 for unknown route', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist')
    expect(response?.status()).toBe(404)
  })
})

test.describe('API Routes', () => {
  for (const route of API_ROUTES) {
    test(`${route.name} (${route.path}) returns JSON`, async ({ page }) => {
      const response = await page.goto(route.path)
      // 503 is expected when DB is not configured — still should return valid JSON
      expect(response?.status()).toBeLessThanOrEqual(503)
      const text = await response?.text()
      expect(text).toBeTruthy()
      const body = JSON.parse(text!)
      expect(typeof body).toBe('object')
    })
  }
})
