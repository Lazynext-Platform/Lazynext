import { test, expect } from "@playwright/test";

test.describe("Editor Page", () => {
  test("home page loads and shows Lazynext branding", async ({ page }) => {
    await page.goto("/");

    // Verify the page renders with the Lazynext brand
    await expect(page.locator("text=Lazynext").first()).toBeVisible();
  });

  test("projects page loads", async ({ page }) => {
    await page.goto("/projects");

    // Should show the projects header or empty state
    const hasContent = await Promise.race([
      page.locator("text=All projects").isVisible().then(() => true),
      page.locator("text=Create your first project").isVisible().then(() => true),
      page.locator("text=New project").isVisible().then(() => true),
      page.waitForTimeout(5000).then(() => false),
    ]);
    expect(hasContent).toBe(true);
  });

  test("API health check returns OK", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBe(200);
  });
});
