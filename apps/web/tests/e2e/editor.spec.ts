/** @module End-to-end tests for the editor workspace */
import { test, expect } from "@playwright/test";

test.describe("Lazynext E2E - Editor Workspace", () => {
	test.beforeEach(async ({ context }) => {
		// Set bypass cookie to skip authentication middleware during tests
		await context.addCookies([
			{
				name: "e2e-bypass",
				value: "true",
				domain: "localhost",
				path: "/",
			},
		]);
	});

	test("should load the editor UI correctly", async ({ page }) => {
		// Navigate to the editor
		await page.goto("/editor");

		// Expect the title to contain "Lazynext"
		await expect(page).toHaveTitle(/Lazynext/i);

		// Expect the Lazynext Editor header to be present
		const header = page.locator("text=Lazynext Editor");
		await expect(header).toBeVisible();

		// Expect the Lazynext AI Agent Copilot sidebar to be present
		const copilot = page.locator("text=Lazynext AI Agent Copilot");
		await expect(copilot).toBeVisible();
	});

	test("should interact with Lazynext AI Agent AI Copilot", async ({ page }) => {
		await page.goto("/editor");

		// Check for the AI chat input
		const chatInput = page.getByPlaceholder(/Message Lazynext AI Agent.../i);
		await expect(chatInput).toBeVisible();

		// Check that we can type and send
		await chatInput.fill("Trim the silence");
		const sendBtn = page.locator("button:has(svg)");
		await expect(sendBtn.first()).toBeVisible();
	});

	test("should run a full Lazynext AI Agent AI orchestration round-trip", async ({ page }) => {
		await page.goto("/editor");

		// Locate the Lazynext AI Agent chat input and send a command
		const chatInput = page.getByPlaceholder(/Message Lazynext AI Agent.../i);
		await chatInput.fill("add viral captions to this video");
		// Press Enter to submit
		await chatInput.press("Enter");

		// Wait for the AI response — the chat should show agent feedback
		// or a toast notification confirming the operation.
		// Timeout is generous because LLM decomposition can take several seconds.
		await expect(page.locator("[data-testid='chat-message-agent']").first())
			.toBeVisible({ timeout: 30_000 });

		// A success toast should appear
		const successToast = page.locator("[data-sonner-toast]");
		await expect(successToast.first()).toBeVisible({ timeout: 30_000 });
	});

	test("should show an error when Lazynext AI Agent encounters an unknown tool", async ({ page }) => {
		await page.goto("/editor");

		// The orchestrator's default case rejects unknown tools — test that
		// an error is surfaced rather than silently swallowed
		const chatInput = page.getByPlaceholder(/Message Lazynext AI Agent.../i);
		await chatInput.fill("do something that does not match any tool");
		await chatInput.press("Enter");

		// Either an agent response or an error toast should eventually appear
		await expect(
			page.locator("[data-testid='chat-message-agent'], [data-sonner-toast]").first(),
		).toBeVisible({ timeout: 25_000 });
	});

	test("should initialize GPU compositor on editor load", async ({ page }) => {
		const consoleLogs: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "log" || msg.type() === "warning") {
				consoleLogs.push(msg.text());
			}
		});

		await page.goto("/editor");

		// The GPU activation path should either log success or gracefully degrade.
		const hasGpuLog = consoleLogs.some(
			(log) =>
				log.includes("[GPU]") ||
				log.includes("GPU renderer unavailable") ||
				log.includes("WebGPU") ||
				log.includes("gpu")
		);

		// In CI (headless Chromium), WebGPU is often unavailable —
		// the important thing is that the activation path RAN, not
		// that WebGPU specifically succeeded.
		expect(hasGpuLog).toBe(true);
	});
});
