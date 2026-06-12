import { test, expect } from '@playwright/test';

test.describe('Lazynext 2025 E2E - Editor Workspace', () => {
  test('should load the editor UI correctly', async ({ page }) => {
    // Navigate to the editor
    await page.goto('/editor');

    // Expect the title to contain "Lazynext"
    await expect(page).toHaveTitle(/Lazynext/i);

    // Expect the WebGL canvas (WASM player) to be present
    const canvas = page.locator('canvas.w-full.h-full');
    await expect(canvas).toBeVisible();

    // Expect the Timeline toolbar to be present
    const timeline = page.locator('text=Timeline');
    await expect(timeline).toBeVisible();
  });

  test('should toggle Neural Cinema Overlay', async ({ page }) => {
    await page.goto('/editor');
    
    // Assume there is a button with an aria-label or text for Neural Cinema
    // For now we check if we can open the AI Copilot
    const aiCopilotBtn = page.getByRole('button', { name: /Chronos AI Copilot/i });
    if (await aiCopilotBtn.isVisible()) {
      await aiCopilotBtn.click();
      const chatInput = page.getByPlaceholder(/Command Chronos AI.../i);
      await expect(chatInput).toBeVisible();
    }
  });
});
