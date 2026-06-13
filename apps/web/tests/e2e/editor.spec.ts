import { test, expect } from '@playwright/test';

test.describe('Lazynext E2E - Editor Workspace', () => {
  test.beforeEach(async ({ context }) => {
    // Set bypass cookie to skip authentication middleware during tests
    await context.addCookies([
      {
        name: 'e2e-bypass',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('should load the editor UI correctly', async ({ page }) => {
    // Navigate to the editor
    await page.goto('/editor');

    // Expect the title to contain "Lazynext"
    await expect(page).toHaveTitle(/Lazynext/i);

    // Expect the Lazynext Editor header to be present
    const header = page.locator('text=Lazynext Editor');
    await expect(header).toBeVisible();

    // Expect the Chronos Copilot sidebar to be present
    const copilot = page.locator('text=Chronos Copilot');
    await expect(copilot).toBeVisible();
  });

  test('should interact with Chronos AI Copilot', async ({ page }) => {
    await page.goto('/editor');
    
    // Check for the AI chat input
    const chatInput = page.getByPlaceholder(/Message Chronos.../i);
    await expect(chatInput).toBeVisible();
    
    // Check that we can type and send
    await chatInput.fill('Trim the silence');
    const sendBtn = page.locator('button:has(svg)');
    await expect(sendBtn.first()).toBeVisible();
  });
});
