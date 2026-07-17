/**
 * @module Better Auth route handler — delegates all auth requests (GET, POST)
 * to the Better Auth library via the Next.js handler adapter.
 *
 * POST requests to email-based auth endpoints (sign-in/email, sign-up/email,
 * sign-in/magic-link, request-password-reset) require Turnstile CAPTCHA
 * verification when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured.
 * OAuth callbacks and other flows are exempt (they go through browser redirects
 * that already pass Turnstile on their origin pages).
 */

import { auth } from "@/auth/server";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/auth/rate-limit";

const handlers = toNextJsHandler(auth);

/** Utility representing GET. */
export const GET = handlers.GET;

const API_GATEWAY_URL =
	process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8005";

/** Paths that require CAPTCHA verification (email-based auth flows). */
const CAPTCHA_REQUIRED_PATHS = [
	"/api/auth/sign-in/email",
	"/api/auth/sign-up/email",
	"/api/auth/sign-in/magic-link",
	"/api/auth/request-password-reset",
];

export async function POST(request: Request) {
	const { limited } = await checkAuthRateLimit({ request });
	if (limited) {
		return NextResponse.json(
			{ error: "Too many requests. Please try again in a minute." },
			{ status: 429 },
		);
	}

	// Server-side captcha verification for email-based auth flows.
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
	if (siteKey) {
		const url = new URL(request.url);
		const needsCaptcha = CAPTCHA_REQUIRED_PATHS.some((p) =>
			url.pathname.endsWith(p.replace("/api/auth/", "")),
		);

		if (needsCaptcha) {
			const token = request.headers.get("X-Captcha-Token");
			if (!token) {
				return NextResponse.json(
					{ error: "CAPTCHA verification required" },
					{ status: 403 },
				);
			}

			try {
				const captchaRes = await fetch(
					`${API_GATEWAY_URL}/api/v1/captcha/verify-turnstile`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ token }),
					},
				);

				if (!captchaRes.ok) {
					return NextResponse.json(
						{ error: "CAPTCHA verification failed" },
						{ status: 403 },
					);
				}

				const data = (await captchaRes.json()) as { success: boolean };
				if (!data.success) {
					return NextResponse.json(
						{ error: "Invalid CAPTCHA token" },
						{ status: 403 },
					);
				}
			} catch {
				// Verification service down → fail open (rate limiting protects).
			}
		}
	}

	return handlers.POST(request);
}
