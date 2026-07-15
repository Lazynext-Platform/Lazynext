/**
 * Utility to verify a Cloudflare Turnstile token against the API Gateway.
 *
 * @module components/auth/captcha-verify
 */

const API_GATEWAY_URL =
	process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8005";

/**
 * Verifies a Turnstile token with the API Gateway.
 * Returns `true` if the token is valid, `false` otherwise.
 * Skips verification if CAPTCHA is not configured (dev mode).
 */
export async function verifyCaptchaToken(token: string): Promise<boolean> {
	if (!token) return false;

	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
	if (!siteKey) {
		return true;
	}

	try {
		const res = await fetch(
			`${API_GATEWAY_URL}/api/v1/captcha/verify-turnstile`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			},
		);

		if (!res.ok) return false;
		const data = await res.json();
		return data.success === true;
	} catch {
		return false;
	}
}
