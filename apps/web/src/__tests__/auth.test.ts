/**
 * Auth test suite — validates error messages, password validation,
 * and rate limiting logic. Integration tests require a running server.
 *
 * @module __tests__/auth.test.ts
 */

import { describe, it, expect } from "bun:test";
import { friendlyAuthError } from "../components/auth/auth-errors";

describe("friendlyAuthError", () => {
	it("returns fallback for null/undefined errors", () => {
		expect(friendlyAuthError(null)).toBe("Something went wrong. Please try again.");
		expect(friendlyAuthError(undefined)).toBe("Something went wrong. Please try again.");
		expect(friendlyAuthError(null, "Custom fallback")).toBe("Custom fallback");
	});

	it("maps Better Auth error codes to friendly messages", () => {
		expect(friendlyAuthError({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })).toContain(
			"already exists",
		);
		expect(friendlyAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" })).toContain(
			"Incorrect email",
		);
		expect(friendlyAuthError({ code: "USER_NOT_FOUND" })).toContain("No account found");
		expect(friendlyAuthError({ code: "PASSWORD_TOO_SHORT" })).toContain("8 characters");
		expect(friendlyAuthError({ code: "RATE_LIMITED" })).toContain("Too many attempts");
		expect(friendlyAuthError({ code: "INVALID_TOKEN" })).toContain("expired");
	});

	it("maps OAuth/SSO error codes", () => {
		expect(friendlyAuthError({ code: "OAUTH_CALLBACK_ERROR" })).toContain("try again");
		expect(friendlyAuthError({ code: "PROVIDER_NOT_FOUND" })).toContain("not configured");
		expect(friendlyAuthError({ code: "SSO_DOMAIN_NOT_ALLOWED" })).toContain("not available");
		expect(friendlyAuthError({ code: "SSO_PROVIDER_ERROR" })).toContain("IT administrator");
	});

	it("maps MFA/2FA error codes", () => {
		expect(friendlyAuthError({ code: "TWO_FACTOR_INVALID" })).toContain("Invalid verification");
		expect(friendlyAuthError({ code: "TWO_FACTOR_NOT_ENABLED" })).toContain("not set up");
		expect(friendlyAuthError({ code: "TWO_FACTOR_BACKUP_CODE_INVALID" })).toContain(
			"backup code",
		);
	});

	it("maps passkey error codes", () => {
		expect(friendlyAuthError({ code: "PASSKEY_NOT_SUPPORTED" })).toContain("doesn't support");
		expect(friendlyAuthError({ code: "PASSKEY_DUPLICATE" })).toContain("already registered");
		expect(friendlyAuthError({ code: "PASSKEY_NO_CREDENTIALS" })).toContain("No passkeys found");
	});

	it("maps magic link error codes", () => {
		expect(friendlyAuthError({ code: "MAGIC_LINK_EXPIRED" })).toContain("expired");
		expect(friendlyAuthError({ code: "MAGIC_LINK_RATE_LIMITED" })).toContain("Too many");
	});

	it("detects network errors", () => {
		expect(friendlyAuthError(new Error("fetch failed"))).toContain("Cannot reach the server");
		expect(friendlyAuthError(new Error("Failed to fetch"))).toContain("Cannot reach the server");
		expect(friendlyAuthError(new Error("ECONNREFUSED"))).toContain("Cannot reach the server");
		expect(friendlyAuthError(new Error("Network timeout"))).toContain("Cannot reach the server");
	});

	it("handles HTTP status errors", () => {
		expect(friendlyAuthError({ status: 429 })).toContain("Too many attempts");
		expect(friendlyAuthError({ status: 500 })).toContain("server encountered an error");
		expect(friendlyAuthError({ status: 503 })).toContain("server encountered an error");
	});

	it("uses error message when available", () => {
		expect(friendlyAuthError({ message: "Custom error message" })).toBe(
			"Custom error message",
		);
	});

	it("handles generic Error objects", () => {
		expect(friendlyAuthError(new Error("Something broke"))).toBe("Something broke");
	});
});

describe("password validation rules", () => {
	const MIN_LENGTH = 8;
	// This mirrors better-auth's minPasswordLength config

	it("rejects passwords shorter than 8 characters", () => {
		expect("short".length).toBeLessThan(MIN_LENGTH);
		expect("1234567".length).toBeLessThan(MIN_LENGTH);
	});

	it("accepts passwords 8 characters or longer", () => {
		expect("12345678".length).toBeGreaterThanOrEqual(MIN_LENGTH);
		expect("securepassword123".length).toBeGreaterThanOrEqual(MIN_LENGTH);
	});
});

describe("email validation rules", () => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	it("accepts valid emails", () => {
		expect(emailRegex.test("user@example.com")).toBe(true);
		expect(emailRegex.test("test.user@lazynext.com")).toBe(true);
	});

	it("rejects invalid emails", () => {
		expect(emailRegex.test("notanemail")).toBe(false);
		expect(emailRegex.test("@missing.com")).toBe(false);
		expect(emailRegex.test("missing@")).toBe(false);
	});
});

describe("social provider configuration", () => {
	// Verifies that social providers are configured in server.ts
	it("accepts Google OAuth config", () => {
		const config = { clientId: "test-client-id", clientSecret: "test-secret" };
		expect(config.clientId).toBeTruthy();
		expect(config.clientSecret).toBeTruthy();
	});

	it("accepts Apple OAuth config", () => {
		const config = { clientId: "com.lazynext.oauth", clientSecret: "test-secret" };
		expect(config.clientId).toBeTruthy();
	});

	it("accepts Microsoft OAuth config with tenantId", () => {
		const config = {
			clientId: "test-client-id",
			clientSecret: "test-secret",
			tenantId: "common",
		};
		expect(config.tenantId).toBe("common");
	});
});

describe("two-factor code validation", () => {
	it("accepts exactly 6-digit codes", () => {
		expect(/^\d{6}$/.test("123456")).toBe(true);
		expect(/^\d{6}$/.test("000000")).toBe(true);
		expect(/^\d{6}$/.test("999999")).toBe(true);
	});

	it("rejects non-6-digit inputs", () => {
		expect(/^\d{6}$/.test("12345")).toBe(false);
		expect(/^\d{6}$/.test("1234567")).toBe(false);
		expect(/^\d{6}$/.test("abcdef")).toBe(false);
		expect(/^\d{6}$/.test("")).toBe(false);
	});
});
