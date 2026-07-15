/**
 * @module components/auth/auth-errors
 * @description Maps Better Auth / network errors into friendly,
 *   actionable user-facing messages so sign-up/sign-in/reset failures
 *   are never a dead-end "Sign up failed".
 *
 *   Covers email/password, OAuth (Google/Apple/Microsoft),
 *   Magic Link, MFA/TOTP, Passkeys, and SSO error codes.
 */

export interface AuthErrorLike {
	message?: string;
	code?: string;
	status?: number;
	statusText?: string;
}

const FRIENDLY: Record<string, string> = {
	// ── Email/Password ──────────────────────────────────────────
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

	// ── OAuth / Social Login ────────────────────────────────────
	OAUTH_CALLBACK_ERROR:
		"Sign in with this provider failed. Please try again.",
	ACCOUNT_NOT_LINKED:
		"This account is not linked to that sign-in method. Use your original sign-in method or link the account in settings.",
	PROVIDER_NOT_FOUND:
		"This sign-in provider is not configured. Please use another method.",
	OAUTH_EMAIL_NOT_VERIFIED:
		"Your email with this provider isn't verified. Verify it first, then try again.",

	// ── Magic Link ───────────────────────────────────────────────
	MAGIC_LINK_EXPIRED:
		"This magic link has expired. Request a new one.",
	MAGIC_LINK_INVALID:
		"This magic link is invalid or already used. Request a new one.",
	MAGIC_LINK_RATE_LIMITED:
		"Too many magic link requests. Please wait a minute and try again.",

	// ── MFA / Two-Factor (TOTP) ─────────────────────────────────
	TWO_FACTOR_INVALID:
		"Invalid verification code. Check your authenticator app and try again.",
	TWO_FACTOR_BACKUP_CODE_INVALID:
		"Invalid backup code. Each code can only be used once.",
	TWO_FACTOR_ALREADY_ENABLED:
		"Two-factor authentication is already enabled on this account.",
	TWO_FACTOR_NOT_ENABLED:
		"Two-factor authentication is not set up on this account.",
	TWO_FACTOR_REQUIRED:
		"Enter the verification code from your authenticator app to continue.",

	// ── Passkeys / WebAuthn ──────────────────────────────────────
	PASSKEY_NOT_SUPPORTED:
		"Your device doesn't support passkeys. Use a different sign-in method or update your browser.",
	PASSKEY_REGISTRATION_FAILED:
		"Failed to register this passkey. Try again or use a different device.",
	PASSKEY_AUTHENTICATION_FAILED:
		"Could not authenticate with this passkey. Try another method.",
	PASSKEY_DUPLICATE:
		"This passkey is already registered on your account.",
	PASSKEY_NO_CREDENTIALS:
		"No passkeys found on this account. Set one up in account settings.",

	// ── SSO / SAML / OIDC ────────────────────────────────────────
	SSO_DOMAIN_NOT_ALLOWED:
		"Single sign-on is not available for your email domain. Sign in with email instead.",
	SSO_PROVIDER_ERROR:
		"Your company's single sign-on provider returned an error. Contact your IT administrator.",
	SSO_CONNECTION_EXISTS:
		"This SSO connection is already configured. Remove the existing one first.",
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
