/**
 * @module User feedback submission endpoint — rate-limited, Zod-validated
 * POST handler that persists feedback entries.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/auth/rate-limit";
import { submitFeedback, MAX_MESSAGE_LENGTH } from "@/feedback";

const submitSchema = z.object({
	message: z
		.string()
		.min(1, "Message is required")
		.max(MAX_MESSAGE_LENGTH, "Message too long"),
});

const API_GATEWAY_URL =
	process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8005";

export async function POST(request: NextRequest) {
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	// Server-side captcha verification when Turnstile is configured
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
	if (siteKey) {
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
		} catch {
			// Verification service down — fail open (rate limiting protects)
		}
	}

	const body = await request.json();
	const result = submitSchema.safeParse(body);

	if (!result.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: result.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	const entry = await submitFeedback(result.data);
	return NextResponse.json({ entry }, { status: 201 });
}
