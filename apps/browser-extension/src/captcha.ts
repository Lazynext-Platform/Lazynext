/**
 * CAPTCHA utility for the browser extension.
 *
 * Uses proof-of-work (hashcash) challenges from the API Gateway.
 * The extension runs in the browser context, so we use the Web Crypto API.
 */

const API_GATEWAY_URL = "http://localhost:8005";

interface PowChallenge {
	challenge_id: string;
	prefix: string;
	difficulty: number;
	expires_at: number;
}

async function sha256(message: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	return crypto.subtle.digest("SHA-256", data);
}

function checkDifficulty(hash: ArrayBuffer, difficulty: number): boolean {
	const bytes = new Uint8Array(hash);
	const fullBytes = Math.floor(difficulty / 8);
	const remainingBits = difficulty % 8;

	for (let i = 0; i < fullBytes; i++) {
		if (bytes[i] !== 0) return false;
	}

	if (remainingBits > 0 && fullBytes < bytes.length) {
		const mask = 0xff << (8 - remainingBits);
		if ((bytes[fullBytes] & mask) !== 0) return false;
	}

	return true;
}

async function solveChallenge(challenge: PowChallenge): Promise<number> {
	const { prefix, difficulty } = challenge;

	for (let nonce = 0; nonce < 1_000_000_000; nonce++) {
		const hash = await sha256(`${prefix}${nonce}`);
		if (checkDifficulty(hash, difficulty)) {
			return nonce;
		}

		if (nonce % 5000 === 0) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
	}

	throw new Error("Could not solve proof-of-work challenge");
}

async function getChallenge(): Promise<PowChallenge> {
	const res = await fetch(`${API_GATEWAY_URL}/api/v1/captcha/challenge`);
	if (!res.ok) throw new Error("Failed to get CAPTCHA challenge");
	return res.json();
}

async function verifySolution(
	challengeId: string,
	nonce: number,
): Promise<boolean> {
	const res = await fetch(`${API_GATEWAY_URL}/api/v1/captcha/verify-pow`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ challenge_id: challengeId, nonce }),
	});
	if (!res.ok) return false;
	const data = await res.json();
	return data.success === true;
}

/**
 * Performs a full proof-of-work CAPTCHA verification.
 * Returns a captcha token string, or null if verification failed.
 */
export async function performCaptcha(): Promise<string | null> {
	try {
		const challenge = await getChallenge();
		const nonce = await solveChallenge(challenge);
		const verified = await verifySolution(challenge.challenge_id, nonce);

		if (verified) {
			return `${challenge.challenge_id}:${nonce}`;
		}

		return null;
	} catch (err) {
		console.error("[Lazynext Ext] CAPTCHA failed:", err);
		return null;
	}
}
