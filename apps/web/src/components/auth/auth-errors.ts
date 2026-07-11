/**
 * @module components/auth/auth-errors
 * @description Maps Better Auth / network errors into friendly,
 *   actionable user-facing messages so sign-up/sign-in/reset failures
 *   are never a dead-end "Sign up failed".
 */

export interface AuthErrorLike {
	message?: string;
	code?: string;
	status?: number;
	statusText?: string;
}

const FRIENDLY: Record<string, string> = {
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
		"An account with this email already exists. Try signing in instead.",
	INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password. Please try again.",
	INVALID_PASSWORD: "Password is incorrect. Please try again.",
	USER_NOT_FOUND: "No account found with this email. Try signing up instead.",
	EMAIL_NOT_VERIFIED:
		"Please verify your email address before signing in.",
	PASSWORD_TOO_SHORT: "Password must be at least 8 characters long.",
	PASSWORD_TOO_LONG: "Password is too long. Use 128 characters or fewer.",
	RATE_LIMITED:
		"Too many attempts. Please wait a minute and try again.",
	INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
};

function looksLikeNetwork(message: string): boolean {
	const m = message.toLowerCase();
	return (
		m.includes("fetch failed") ||
		m.includes("network") ||
		m.includes("failed to fetch") ||
		m.includes("econnrefused") ||
		m.includes("enotfound") ||
		m.includes("failed query") ||
		m.includes("connect") ||
		m.includes("timeout") ||
		m.includes("unreachable")
	);
}

/**
 * Resolve an auth error (from Better Auth client, a thrown Error, or a raw
 * Response) into a single human-readable string suitable for a toast.
 */
export function friendlyAuthError(
	error: AuthErrorLike | Error | unknown,
	fallback = "Something went wrong. Please try again.",
): string {
	if (!error) return fallback;

	if (error instanceof Error) {
		const message = error.message || "";
		if (looksLikeNetwork(message)) {
			return "Cannot reach the server. The service may be starting up or unreachable — please try again in a moment.";
		}
		return message || fallback;
	}

	const err = error as AuthErrorLike;

	if (err.code && FRIENDLY[err.code]) {
		return FRIENDLY[err.code];
	}

	const message = (err.message || "").trim();
	if (message) {
		if (looksLikeNetwork(message)) {
			return "Cannot reach the server. The service may be starting up or unreachable — please try again in a moment.";
		}
		return message;
	}

	if (err.status === 429) {
		return FRIENDLY.RATE_LIMITED;
	}
	if (err.status && err.status >= 500) {
		return "The server encountered an error. Please try again in a moment.";
	}

	return fallback;
}
