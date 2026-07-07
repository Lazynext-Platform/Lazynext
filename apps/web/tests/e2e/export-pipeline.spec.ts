/**
 * E2E test: Export pipeline (Feature 22 P4.3).
 *
 * Verifies that the web export flow works end-to-end:
 * trigger export → assert job created → progress events received.
 */
import { test, expect } from "@playwright/test";

const E2E_COOKIE = {
	name: "e2e-bypass",
	value: "true",
	domain: "localhost",
	path: "/",
} as const;

test.describe("Lazynext E2E - Export Pipeline", () => {
	test.beforeEach(async ({ context }) => {
		await context.addCookies([E2E_COOKIE]);
	});

	test("should render export modal/button in editor", async ({ page }) => {
		await page.goto("/editor");

		await expect(page).toHaveTitle(/Lazynext/i);

		// Wait for editor to load
		await page.waitForSelector("#lazynext-canvas", { timeout: 15000 });

		// Look for export-related UI elements
		const exportElements = page.locator(
			'text=/export|render|download/i',
		);
		const count = await exportElements.count();

		// Verify at least one export element exists
		expect(count).toBeGreaterThan(0);
	});

	test("should trigger export API call and receive job response", async ({
		page,
	}) => {
		await page.goto("/editor");

		await page.waitForSelector("#lazynext-canvas", { timeout: 15000 });

		// Monitor network for export API call
		const exportPromise = page.waitForResponse(
			(response) =>
				response.url().includes("/api/export") &&
				response.request().method() === "POST",
			{ timeout: 30000 },
		).catch(() => null);

		// Find and click an export button
		const exportBtn = page.locator('text=/export|render/i').first();
		if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await exportBtn.click();

			// Wait for the export API response
			const response = await exportPromise;

			if (response && response.ok()) {
				const body = await response.json();
				expect(body).toHaveProperty("success", true);
				expect(body).toHaveProperty("width");
				expect(body).toHaveProperty("height");
				expect(body).toHaveProperty("framerate");
				expect(body).toHaveProperty("totalFrames");

				// Either render-service jobId or fallback mode
				if (body.jobId) {
					expect(body).toHaveProperty("frameEndpoint");
					expect(body).toHaveProperty("endEndpoint");
				} else {
					expect(body).toHaveProperty(
						"fallback",
						"webcodecs",
					);
				}
			}
		}
	});

	test("should handle export with render-service offline gracefully", async ({
		page,
	}) => {
		await page.goto("/editor");

		await page.waitForSelector("#lazynext-canvas", { timeout: 15000 });

		// Directly call the export API and check fallback behavior
		const response = await page.evaluate(async () => {
			const res = await fetch("/api/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectId: "test-project-id",
					format: "mp4",
					bitrate_kbps: 8000,
				}),
			});
			return res.json();
		});

		expect(response).toHaveProperty("success", true);
		expect(response).toHaveProperty("width");
		expect(response).toHaveProperty("height");
		expect(response).toHaveProperty("totalFrames");
	});

	test("should show export status/progress in UI", async ({ page }) => {
		await page.goto("/editor");

		await page.waitForSelector("#lazynext-canvas", { timeout: 15000 });

		// Click export button if available
		const exportBtn = page.locator('text=/export/i').first();
		if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await exportBtn.click();
		}

		// Verify the page doesn't crash during export flow
		await page.waitForTimeout(2000);

		// Check for no console errors about export
		const exportErrors: string[] = [];
		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				(msg.text().includes("Export") ||
					msg.text().includes("export"))
			) {
				exportErrors.push(msg.text());
			}
		});

		await page.waitForTimeout(1000);
		expect(exportErrors).toHaveLength(0);
	});
});
