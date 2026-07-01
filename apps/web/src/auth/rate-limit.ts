/**
 * @module auth/rate-limit
 * @description Upstash Redis-backed sliding-window rate limiter.
 *   100 requests per minute per IP by default.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { webEnv } from "@/env/web";

const redis = new Redis({
	url: webEnv.UPSTASH_REDIS_REST_URL,
	token: webEnv.UPSTASH_REDIS_REST_TOKEN,
});

/** Shared rate limiter instance (100 req/min sliding window). */
export const baseRateLimit = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(100, "1 m"),
	analytics: true,
	prefix: "rate-limit",
});

/**
 * Checks whether the request has exceeded the rate limit.
 * Returns `{ success, limited }` where `limited` is `true` when the
 * limit has been hit.
 */
export async function checkRateLimit({ request }: { request: Request }) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = await baseRateLimit.limit(ip);
	return { success, limited: !success };
}
