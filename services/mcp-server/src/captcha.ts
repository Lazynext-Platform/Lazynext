/**
 * CAPTCHA verification layer for the MCP server.
 *
 * The MCP server requires two forms of "not a robot" proof:
 *
 * 1. **API Key** (primary) — The `LAZYNEXT_MCP_API_KEY` env var must
 *    match the `X-API-Key` header or `_api_key` parameter on every
 *    request. This is the main bot deterrent.
 *
 * 2. **Proof-of-Work** (secondary, optional) — If
 *    `MCP_REQUIRE_POW=true` is set, the server requires a valid
 *    proof-of-work solution before accepting any request. The client
 *    must solve a hashcash challenge from the API Gateway and include
 *    the solution in the `X-Pow-Token` header.
 *
 * @module src/captcha
 */

import { createHash } from "node:crypto";

const API_GATEWAY_URL =
	process.env.API_GATEWAY_URL || "http://localhost:8005";

interface PowChallenge {
	challenge_id: string;
	prefix: string;
	difficulty: number;
	expires_at: number;
}

/** Cached map of verified captcha tokens → expiry timestamp. */
const verifiedTokens = new Map<string, number>();

function checkDifficulty(hash: Buffer, difficulty: number): boolean {
	const fullBytes = Math.floor(difficulty / 8);
	const remainingBits = difficulty % 8;
	for (let i = 0; i < fullBytes; i++) {
		if (hash[i] !== 0) return false;
	}
	if (remainingBits > 0 && fullBytes < hash.length) {
		const mask = 0xff << (8 - remainingBits);
		if ((hash[fullBytes] & mask) !== 0) return false;
	}
	return true;
}

/**
 * Verifies a proof-of-work token against the API Gateway.
 * Tokens are cached for 30 minutes to avoid re-verification.
 *
 * Returns `true` if the token is valid (or if PoW is disabled).
 */
export async function verifyPowToken(token: string): Promise<boolean> {
	if (process.env.MCP_REQUIRE_POW !== "true") return true;

	if (!token) return false;

	// Check cache first
	const cached = verifiedTokens.get(token);
	if (cached && cached > Date.now()) return true;

	const [challengeId, nonceStr] = token.split(":");
	if (!challengeId || !nonceStr) return false;

	try {
		const res = await fetch(
			`${API_GATEWAY_URL}/api/v1/captcha/verify-pow`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					challenge_id: challengeId,
					nonce: parseInt(nonceStr, 10),
				}),
			},
		);

		if (!res.ok) return false;

		const data = (await res.json()) as { success: boolean };
		if (data.success) {
			// Cache for 30 minutes
			verifiedTokens.set(token, Date.now() + 30 * 60 * 1000);
			return true;
		}

		return false;
	} catch {
		return false;
	}
}

/**
 * Cleans up expired cached tokens.
 */
export function cleanupCaptchaCache(): void {
	const now = Date.now();
	for (const [token, expiry] of verifiedTokens) {
		if (expiry < now) verifiedTokens.delete(token);
	}
}
