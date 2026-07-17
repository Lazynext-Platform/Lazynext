/**
 * Auth service — REST client for Better Auth API.
 * Calls the web app's Better Auth endpoints for sign-in, sign-up,
 * social OAuth (Google/Apple/Microsoft), magic link, MFA,
 * password reset, and token management.
 *
 * Since React Native has no cookies, we store the session token
 * and user data in memory. The token is extracted from the
 * sign-in/sign-up response body (Better Auth returns it there).
 *
 * All email-based auth flows require proof-of-work CAPTCHA
 * verification before proceeding.
 *
 * @module services/auth
 */

import { performCaptcha } from "./captcha";

const AUTH_BASE_URL = process.env.EXPO_PUBLIC_AUTH_URL || "http://localhost:3000";

/** Type definition for AuthResponse. */
export interface AuthResponse {
	data?: Record<string, unknown>;
	error?: { message: string; status?: number; captchaRequired?: boolean };
}

/** Type definition for SessionUser. */
export interface SessionUser {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image?: string;
}

/** Type definition for Session. */
export interface Session {
	token: string;
	user: SessionUser;
}

let cachedSession: Session | null = null;

/** Utility representing getStoredToken. */
export function getStoredToken(): string | null {
	return cachedSession?.token || null;
}

/** Utility representing getStoredSession. */
export function getStoredSession(): Session | null {
	return cachedSession;
}

async function authFetch(
	path: string,
	body: Record<string, unknown>,
	captchaToken?: string,
): Promise<AuthResponse> {
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(cachedSession?.token
				? { Authorization: `Bearer ${cachedSession.token}` }
				: {}),
		};
		if (captchaToken) {
			headers["X-Captcha-Token"] = captchaToken;
		}
		const res = await fetch(`${AUTH_BASE_URL}/api/auth/${path}`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});
		const data = (await res.json()) as Record<string, unknown>;

		if (!res.ok) {
			return {
				error: {
					message: (data.message as string) || "Request failed",
					status: res.status,
				},
			};
		}

		return { data };
	} catch (err) {
		return {
			error: {
				message: err instanceof Error ? err.message : "Network error",
			},
		};
	}
}

function extractSession(data: Record<string, unknown>): Session | null {
	const token = data.token as string | undefined;
	const user = data.user as SessionUser | undefined;
	if (token && user) {
		return { token, user };
	}
	return null;
}

// ── Email/Password ──────────────────────────────────────────

export async function signIn(
	email: string,
	password: string,
): Promise<AuthResponse> {
	const captchaToken = await performCaptcha();
	if (!captchaToken) {
		return { error: { message: "CAPTCHA verification failed", captchaRequired: true } };
	}
	const result = await authFetch("sign-in/email", {
		email,
		password,
		rememberMe: true,
	}, captchaToken);
	if (result.data) {
		const session = extractSession(result.data);
		if (session) cachedSession = session;
	}
	return result;
}

export async function signUp(
	name: string,
	email: string,
	password: string,
): Promise<AuthResponse> {
	const captchaToken = await performCaptcha();
	if (!captchaToken) {
		return { error: { message: "CAPTCHA verification failed", captchaRequired: true } };
	}
	const result = await authFetch("sign-up/email", {
		name,
		email,
		password,
	}, captchaToken);
	if (result.data) {
		const session = extractSession(result.data);
		if (session) cachedSession = session;
	}
	return result;
}

// ── Magic Link ──────────────────────────────────────────────

export async function signInWithMagicLink(
	email: string,
	redirectTo = "lazynext://dashboard",
): Promise<AuthResponse> {
	const captchaToken = await performCaptcha();
	if (!captchaToken) {
		return { error: { message: "CAPTCHA verification failed", captchaRequired: true } };
	}
	return authFetch("sign-in/magic-link", {
		email,
		callbackURL: redirectTo,
	}, captchaToken);
}

// ── Social OAuth ────────────────────────────────────────────

export async function signInWithOAuth(
	provider: "google" | "apple" | "microsoft",
	callbackURL = "lazynext://dashboard",
): Promise<AuthResponse> {
	try {
		const res = await fetch(
			`${AUTH_BASE_URL}/api/auth/sign-in/social?provider=${provider}&callbackURL=${encodeURIComponent(callbackURL)}`,
			{ method: "GET" },
		);
		const data = (await res.json()) as Record<string, unknown>;
		if (!res.ok) {
			return {
				error: {
					message: (data.message as string) || "OAuth sign-in failed",
					status: res.status,
				},
			};
		}
		return { data };
	} catch (err) {
		return {
			error: {
				message: err instanceof Error ? err.message : "Network error",
			},
		};
	}
}

// ── Two-Factor Authentication ───────────────────────────────

export async function verifyTwoFactor(
	code: string,
): Promise<AuthResponse> {
	const result = await authFetch("two-factor/verify", { code });
	if (result.data) {
		const session = extractSession(result.data);
		if (session) cachedSession = session;
	}
	return result;
}

export async function enableTwoFactor(
	code?: string,
): Promise<AuthResponse> {
	const body: Record<string, unknown> = {};
	if (code) body.code = code;
	return authFetch("two-factor/enable", body);
}

export async function disableTwoFactor(): Promise<AuthResponse> {
	return authFetch("two-factor/disable", {});
}

export async function generateBackupCodes(): Promise<AuthResponse> {
	return authFetch("two-factor/generate-backup-codes", {});
}

// ── Passkeys / WebAuthn ─────────────────────────────────────

export async function registerPasskey(
	name: string,
): Promise<AuthResponse> {
	return authFetch("passkey/register", { name });
}

export async function authenticateWithPasskey(
	challenge: string,
): Promise<AuthResponse> {
	return authFetch("passkey/authenticate", { challenge });
}

// ── Password Reset ──────────────────────────────────────────

export async function requestPasswordReset(
	email: string,
): Promise<AuthResponse> {
	const captchaToken = await performCaptcha();
	if (!captchaToken) {
		return { error: { message: "CAPTCHA verification failed", captchaRequired: true } };
	}
	return authFetch("request-password-reset", {
		email,
		redirectTo: "/reset-password",
	}, captchaToken);
}

export async function resetPassword(
	newPassword: string,
	token: string,
): Promise<AuthResponse> {
	return authFetch("reset-password", {
		newPassword,
		token,
	});
}

// ── Session Management ──────────────────────────────────────

export async function getSession(): Promise<Session | null> {
	if (!cachedSession?.token) return null;

	try {
		const res = await fetch(
			`${AUTH_BASE_URL}/api/auth/get-session`,
			{
				headers: {
					Authorization: `Bearer ${cachedSession.token}`,
				},
			},
		);
		if (!res.ok) {
			cachedSession = null;
			return null;
		}
		const data = (await res.json()) as {
			user?: SessionUser;
			session?: { token?: string };
		};
		if (data.user && data.session?.token) {
			cachedSession = {
				token: data.session.token,
				user: data.user,
			};
			return cachedSession;
		}
		return cachedSession;
	} catch {
		return cachedSession;
	}
}

export async function signOut(): Promise<void> {
	try {
		await fetch(`${AUTH_BASE_URL}/api/auth/sign-out`, {
			method: "POST",
			headers: cachedSession?.token
				? { Authorization: `Bearer ${cachedSession.token}` }
				: {},
		});
	} catch {
		// Ignore network errors on sign out
	}
	cachedSession = null;
}
