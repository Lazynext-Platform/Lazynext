/**
 * @module auth/rate-limit
 * @description Upstash Redis-backed sliding-window rate limiter.
 *   Falls open (allows the request) when Upstash is not configured — required
 *   config is enforced at boot by the env schema in production, so this only
 *   affects local development without Redis.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { webEnv } from "@/env/web";

/**
 * Build a sliding-window limiter, or `null` when Upstash credentials are
 * absent (e.g. local dev). A `null` limiter means "fail open".
 */
function createLimiter({
	limit,
	window,
	prefix,
}: {
	limit: number;
	window: `${number} ${"s" | "m" | "h"}`;
	prefix: string;
}): Ratelimit | null {
	const url = webEnv.UPSTASH_REDIS_REST_URL;
	const token = webEnv.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token) {
		console.warn(
			`⚠️  Upstash Redis not configured — "${prefix}" rate limiting disabled (fail-open).`,
		);
		return null;
	}
	const redis = new Redis({ url, token });
	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(limit, window),
		analytics: true,
		prefix,
	});
}

/** Shared general-purpose rate limiter (100 req/min sliding window). */
export const baseRateLimit = createLimiter({
	limit: 100,
	window: "1 m",
	prefix: "rate-limit",
});

/** Stricter limiter for authentication endpoints (10 req/min) to blunt brute force. */
export const authRateLimit = createLimiter({
	limit: 10,
	window: "1 m",
	prefix: "rate-limit:auth",
});

function clientIp(request: Request): string {
	return request.headers.get("x-forwarded-for") ?? "anonymous";
}

async function evaluate(
	limiter: Ratelimit | null,
	request: Request,
): Promise<{ success: boolean; limited: boolean }> {
	if (!limiter) {
		return { success: true, limited: false };
	}
	try {
		const { success } = await limiter.limit(clientIp(request));
		return { success, limited: !success };
	} catch (err) {
		// Fail open on limiter/transport errors — never block traffic because
		// the rate-limit backend is unavailable.
		console.error("Rate limit check failed (fail-open):", err);
		return { success: true, limited: false };
	}
}

/**
 * Checks whether the request has exceeded the general rate limit.
 * Returns `{ success, limited }` where `limited` is `true` when the
 * limit has been hit.
 */
export async function checkRateLimit({ request }: { request: Request }) {
	return evaluate(baseRateLimit, request);
}

/**
 * Checks the stricter authentication rate limit (sign-in/sign-up/reset).
 */
export async function checkAuthRateLimit({ request }: { request: Request }) {
	return evaluate(authRateLimit, request);
}
