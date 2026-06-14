import { test, expect } from "@playwright/test";

test.describe("Lazynext Editor Core Flows", () => {
	test("should load the editor and initialize WASM core", async ({ page }) => {
		// Navigate to the editor
		await page.goto("/editor");

		// Verify the loading screen transitions to the main editor
		await expect(
			page.locator("text=Initializing WebGL Context..."),
		).toBeVisible();
		await expect(page.locator("text=Loading Rust Core...")).toBeVisible();

		// Verify the Editor Workspace loads
		const workspace = page.locator(".flex.h-screen.bg-neutral-950");
		await expect(workspace).toBeVisible({ timeout: 15000 });

		// Verify the central WASM Canvas is present
		const canvas = page.locator("canvas");
		await expect(canvas).toBeVisible();
	});

	test("should open Generative Studio via Command Palette", async ({
		page,
	}) => {
		await page.goto("/editor");

		// Wait for load
		await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });

		// Press Cmd+K or Ctrl+K to open palette
		await page.keyboard.press("Control+K");

		// Verify palette appears
		const paletteInput = page.locator('input[placeholder*="Type a command"]');
		await expect(paletteInput).toBeVisible();

		// Type "Generative" and hit enter
		await paletteInput.fill("generative");
		await page.keyboard.press("Enter");

		// Verify the Generative Studio panel opens
		await expect(page.locator("text=Generative Studio")).toBeVisible();
	});
});
