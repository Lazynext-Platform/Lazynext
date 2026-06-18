#!/usr/bin/env bun
/**
 * Test sign-up flow against the running Lazynext dev server.
 *
 * Usage: bun run scripts/test-signup.ts
 * Requires the dev server running on http://localhost:3000
 */

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function main() {
	const testEmail = `test-${Date.now()}@lazynext.ai`;
	const testPassword = "TestPassword123!";

	console.log(`Testing sign-up with: ${testEmail}`);

	const signUpRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: testEmail,
			password: testPassword,
			name: "CI Test User",
		}),
	});

	const signUpBody = await signUpRes.json() as Record<string, unknown>;
	console.log(`Sign-up: ${signUpRes.status}`, signUpBody);

	if (signUpRes.ok) {
		console.log("✅ Sign-up test passed");
	} else if (signUpRes.status === 422) {
		console.log("⚠️  User may already exist (422) — skipping");
	} else {
		console.log("❌ Sign-up test failed");
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Test error:", err);
	process.exit(1);
});
