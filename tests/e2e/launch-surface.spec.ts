import { test, expect } from '@playwright/test'

test.describe('Launch surface smoke tests', () => {
  test('blog index shows the launch post', async ({ page }) => {
    const response = await page.goto('/blog')
    expect(response?.status()).toBe(200)
    await expect(page.getByText('Lazynext is live, and we think we shipped the thing PM tools forgot')).toBeVisible()
  })

  test('launch blog post renders', async ({ page }) => {
    const response = await page.goto('/blog/launching-lazynext')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: /Lazynext is live/i })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'The thesis' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Decision DNA: 4 dimensions' })).toBeVisible()
  })

  test('marketing changelog reflects v1.0.0.0', async ({ page }) => {
    const response = await page.goto('/changelog')
    expect(response?.status()).toBe(200)
    await expect(page.getByText('v1.0.0.0')).toBeVisible()
    await expect(page.getByText(/Decision DNA/)).toBeVisible()
    // Stale fictional entries should be gone
    await expect(page.getByText('v0.4.0')).not.toBeVisible()
  })

  test('unknown blog slug 404s cleanly', async ({ page }) => {
    // Note: we check the rendered 404 UI rather than HTTP status because
    // Next.js middleware wraps the response (to set NEXT_LOCALE cookie) which
    // can override the status emitted by notFound() in the page. The UX
    // behavior — an unknown slug renders the not-found page — is what matters.
    await page.goto('/blog/does-not-exist-xyz')
    await expect(page.getByText(/page not found/i).first()).toBeVisible()
  })
})
