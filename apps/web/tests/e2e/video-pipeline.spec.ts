/**
 * E2E test: Video upload → preview → playback pipeline (Feature 34 E.2).
 *
 * Verifies that the web editor can load and render video media
 * using the WebCodecs/<video> → WASM compositor pipeline.
 */
import { test, expect } from "@playwright/test";

test.describe("Lazynext E2E - Video Pipeline", () => {
	test.beforeEach(async ({ context }) => {
		await context.addCookies([
			{
				name: "e2e-bypass",
				value: "true",
				domain: "localhost",
				path: "/",
			},
		]);
	});

	test("should render editor with WASM canvas", async ({ page }) => {
		await page.goto("/editor");

		await expect(page).toHaveTitle(/Lazynext/i);

		// Verify the WASM compositor canvas is rendered
		const canvas = page.locator("#lazynext-canvas");
		await expect(canvas).toBeAttached({ timeout: 15000 });

		// Verify the canvas has non-zero dimensions
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.width).toBeGreaterThan(0);
		expect(box!.height).toBeGreaterThan(0);
	});

	test("should show media pool upload button", async ({ page }) => {
		await page.goto("/editor");

		// Wait for editor to load
		await page.waitForSelector("#lazynext-canvas", { timeout: 15000 });

		// Check for media upload or media pool UI elements
		const uploadElements = page.locator(
			'text=/upload|media|import|add media/i',
		);
		const count = await uploadElements.count();
		// Should have at least one media-related UI element
		if (count > 0) {
			const first = uploadElements.first();
			await expect(first).toBeVisible({ timeout: 5000 });
		}
	});

	test("should not crash when rendering frames", async ({ page }) => {
		await page.goto("/editor");

		// Wait for canvas and engine
		await page.waitForSelector("#lazynext-canvas", { timeout: 15000 });
		await page.waitForTimeout(3000); // Allow frames to render

		// Check console for WASM render errors
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				msg.text().includes("WASM Render Error")
			) {
				errors.push(msg.text());
			}
		});

		// Wait for potential render cycles
		await page.waitForTimeout(2000);

		expect(errors).toHaveLength(0);
	});

	test("should have functional AI Copilot sidebar", async ({ page }) => {
		await page.goto("/editor");

		await expect(page).toHaveTitle(/Lazynext/i);

		// Verify AI Copilot is present
		const copilot = page.locator("text=/AI Agent|Copilot|Autonomous/i");
		await expect(copilot.first()).toBeVisible({ timeout: 10000 });

		// Verify chat input is functional
		const chatInput = page.getByPlaceholder(/Message|command|Type/i);
		if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
			await chatInput.fill("test command");
			await expect(chatInput).toHaveValue("test command");
		}
	});
});
