/**
 * @module Better Auth route handler — delegates all auth requests (GET, POST)
 * to the Better Auth library via the Next.js handler adapter. POST requests
 * (sign-in, sign-up, password reset, verification) are rate-limited to blunt
 * brute-force attacks.
 */

import { auth } from "@/auth/server";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/auth/rate-limit";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: Request) {
	const { limited } = await checkAuthRateLimit({ request });
	if (limited) {
		return NextResponse.json(
			{ error: "Too many requests. Please try again in a minute." },
			{ status: 429 },
		);
	}
	return handlers.POST(request);
}
