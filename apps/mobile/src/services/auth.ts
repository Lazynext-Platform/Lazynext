/**
 * Auth service — REST client for Better Auth API.
 * Calls the web app's Better Auth endpoints for sign-in, sign-up,
 * password reset, and token management.
 *
 * Since React Native has no cookies, we store the session token
 * and user data in memory. The token is extracted from the
 * sign-in/sign-up response body (Better Auth returns it there).
 *
 * @module services/auth
 */

const AUTH_BASE_URL = process.env.EXPO_PUBLIC_AUTH_URL || "http://localhost:3000";

export interface AuthResponse {
	/** Response payload on success. */
	data?: Record<string, unknown>;
	/** Error details on failure. */
	error?: { message: string; status?: number };
}

export interface SessionUser {
	/** Unique user identifier. */
	id: string;
	/** User's display name. */
	name: string;
	/** User's email address. */
	email: string;
	/** Whether the email is verified. */
	emailVerified: boolean;
	/** Optional avatar image URL. */
	image?: string;
}

export interface Session {
	/** Session bearer token. */
	token: string;
	/** Authenticated user details. */
	user: SessionUser;
}

let cachedSession: Session | null = null;

export function getStoredToken(): string | null {
	return cachedSession?.token || null;
}

export function getStoredSession(): Session | null {
	return cachedSession;
}

async function authFetch(
	path: string,
	body: Record<string, unknown>,
): Promise<AuthResponse> {
	try {
		const res = await fetch(`${AUTH_BASE_URL}/api/auth/${path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(cachedSession?.token
					? { Authorization: `Bearer ${cachedSession.token}` }
					: {}),
			},
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

export async function signIn(
	email: string,
	password: string,
): Promise<AuthResponse> {
	const result = await authFetch("sign-in/email", {
		email,
		password,
		rememberMe: true,
	});

	if (result.data) {
		const session = extractSession(result.data);
		if (session) {
			cachedSession = session;
		}
	}

	return result;
}

export async function signUp(
	name: string,
	email: string,
	password: string,
): Promise<AuthResponse> {
	const result = await authFetch("sign-up/email", {
		name,
		email,
		password,
	});

	if (result.data) {
		const session = extractSession(result.data);
		if (session) {
			cachedSession = session;
		}
	}

	return result;
}

export async function requestPasswordReset(
	email: string,
): Promise<AuthResponse> {
	return authFetch("request-password-reset", {
		email,
		redirectTo: "/reset-password",
	});
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
		// Fallback: if we already have a cached session, keep it
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
