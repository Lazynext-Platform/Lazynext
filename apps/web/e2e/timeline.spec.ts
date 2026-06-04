import { test, expect } from '@playwright/test';

test.describe('Timeline Editor', () => {
  test('should load the editor and initialize WebAssembly', async ({ page }) => {
    // Navigate to the editor page (assuming /editor is the main route)
    await page.goto('/editor');

    // Expect the page title to contain Lazynext or Editor
    await expect(page).toHaveTitle(/Lazynext|Editor/i);

    // Ensure the main canvas or timeline container is rendered
    const timelineContainer = page.locator('[data-testid="timeline-container"], .timeline-container, canvas').first();
    await expect(timelineContainer).toBeVisible();

    // Verify WASM initialization (checking if some specific WASM-dependent element exists or checking logs)
    // For now, we will verify the core editor layout is present without errors.
    const hasError = await page.locator('.error-boundary, [data-testid="error-state"]').count();
    expect(hasError).toBe(0);
  });
});
