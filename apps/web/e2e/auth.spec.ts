import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can navigate to billing and is prompted to upgrade', async ({ page }) => {
    // Navigate directly to the billing page
    await page.goto('/billing');

    // Verify page title / headers
    await expect(page.locator('h1')).toContainText('Billing & Subscriptions');
    
    // Verify the presence of the Upgrade button
    const upgradeButton = page.locator('button', { hasText: 'Upgrade to PRO' });
    await expect(upgradeButton).toBeVisible();
    
    // Verify usage metrics are rendered
    await expect(page.getByText('Agent Executions')).toBeVisible();
  });
});
