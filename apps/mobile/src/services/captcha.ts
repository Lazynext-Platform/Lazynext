/**
 * CAPTCHA service — proof-of-work verification for mobile.
 *
 * Uses a minimal pure-JS SHA-256 implementation with no native
 * module dependencies. Works in React Native Hermes and JSC.
 *
 * @module services/captcha
 */

const API_GATEWAY_URL =
	process.env.EXPO_PUBLIC_API_GATEWAY_URL || "http://localhost:8005";

interface PowChallenge {
	challenge_id: string;
	prefix: string;
	difficulty: number;
	expires_at: number;
}

// ── UTF-8 encoder (pure JS, no TextEncoder) ───────────────────────

function stringToUtf8Bytes(str: string): number[] {
	const bytes: number[] = [];
	for (let i = 0; i < str.length; i++) {
		let code = str.charCodeAt(i);
		if (code < 0x80) {
			bytes.push(code);
		} else if (code < 0x800) {
			bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0xd800 || code >= 0xe000) {
			bytes.push(
				0xe0 | (code >> 12),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		} else {
			i++;
			const next = str.charCodeAt(i);
			code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
			bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}
	return bytes;
}

// ── Minimal SHA-256 (pure JS, no native deps) ──────────────────────

const K: number[] = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
	0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
	0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
	0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
	0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
	0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
	0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x: number, n: number): number {
	return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(input: number[]): number[] {
	const L = input.length;
	const padLen = 64 - ((L + 9) % 64);
	const paddedLen = L + 1 + padLen + 8;
	const padded = Array.from({ length: paddedLen }, () => 0);
	for (let i = 0; i < L; i++) padded[i] = input[i];
	padded[L] = 0x80;

	const bitsLen = L * 8;
	padded[paddedLen - 2] = (bitsLen >>> 8) & 0xff;
	padded[paddedLen - 1] = bitsLen & 0xff;

	let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
		h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

	for (let offset = 0; offset < paddedLen; offset += 64) {
		const w = new Array(64).fill(0);
		for (let i = 0; i < 16; i++) {
			w[i] =
				(padded[offset + i * 4] << 24) |
				(padded[offset + i * 4 + 1] << 16) |
				(padded[offset + i * 4 + 2] << 8) |
				padded[offset + i * 4 + 3];
			w[i] = w[i] >>> 0;
		}

		for (let i = 16; i < 64; i++) {
			const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
			const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
			w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
		}

		let a = h0, b = h1, c = h2, d = h3;
		let e = h4, f = h5, g = h6, h = h7;

		for (let i = 0; i < 64; i++) {
			const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
			const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) >>> 0;
			h = g; g = f; f = e; e = (d + temp1) >>> 0;
			d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
		}

		h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0;
		h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
		h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0;
		h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
	}

	return [
		(h0 >>> 24) & 0xff, (h0 >>> 16) & 0xff, (h0 >>> 8) & 0xff, h0 & 0xff,
		(h1 >>> 24) & 0xff, (h1 >>> 16) & 0xff, (h1 >>> 8) & 0xff, h1 & 0xff,
		(h2 >>> 24) & 0xff, (h2 >>> 16) & 0xff, (h2 >>> 8) & 0xff, h2 & 0xff,
		(h3 >>> 24) & 0xff, (h3 >>> 16) & 0xff, (h3 >>> 8) & 0xff, h3 & 0xff,
		(h4 >>> 24) & 0xff, (h4 >>> 16) & 0xff, (h4 >>> 8) & 0xff, h4 & 0xff,
		(h5 >>> 24) & 0xff, (h5 >>> 16) & 0xff, (h5 >>> 8) & 0xff, h5 & 0xff,
		(h6 >>> 24) & 0xff, (h6 >>> 16) & 0xff, (h6 >>> 8) & 0xff, h6 & 0xff,
		(h7 >>> 24) & 0xff, (h7 >>> 16) & 0xff, (h7 >>> 8) & 0xff, h7 & 0xff,
	];
}

// ── Difficulty checking ─────────────────────────────────────────────

function checkDifficulty(hash: number[], difficulty: number): boolean {
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

// ── Challenge API ───────────────────────────────────────────────────

async function getChallenge(): Promise<PowChallenge> {
	const res = await fetch(`${API_GATEWAY_URL}/api/v1/captcha/challenge`);
	if (!res.ok) throw new Error("Failed to get CAPTCHA challenge");
	return res.json();
}

function solveChallenge(challenge: PowChallenge): number {
	const { prefix, difficulty } = challenge;

	for (let nonce = 0; nonce < 1_000_000_000; nonce++) {
		const input = prefix + String(nonce);
		const bytes = stringToUtf8Bytes(input);
		const hash = sha256Bytes(bytes);
		if (checkDifficulty(hash, difficulty)) return nonce;
	}
	throw new Error("Could not solve proof-of-work challenge");
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
	const data = (await res.json()) as { success: boolean };
	return data.success === true;
}

/**
 * Complete CAPTCHA flow: get challenge, solve it, verify it.
 */
export async function performCaptcha(): Promise<string | null> {
	try {
		const challenge = await getChallenge();

		const nonce = await new Promise<number>((resolve, reject) => {
			setTimeout(() => {
				try { resolve(solveChallenge(challenge)); }
				catch (e) { reject(e); }
			}, 0);
		});

		const verified = await verifySolution(challenge.challenge_id, nonce);
		if (verified) return `${challenge.challenge_id}:${nonce}`;
		return null;
	} catch (err) {
		console.error("CAPTCHA verification failed:", err);
		return null;
	}
}
