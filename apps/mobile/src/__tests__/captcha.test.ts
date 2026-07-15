/**
 * Manual verification tests for the mobile captcha module.
 * Run with: bun run this_file.ts
 * No test framework needed — uses assert for verification.
 */

import {
	stringToUtf8Bytes,
	sha256Bytes,
	checkDifficulty,
} from "../services/captcha";

import assert from "node:assert";

// ── SHA-256 Test Vectors ──────────────────────────────────────────

// SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
{
	const bytes = stringToUtf8Bytes("");
	const hash = sha256Bytes(bytes);
	assert.strictEqual(hash[0], 0xe3, "SHA-256('') byte 0");
	assert.strictEqual(hash[1], 0xb0, "SHA-256('') byte 1");
	assert.strictEqual(hash[2], 0xc4, "SHA-256('') byte 2");
	assert.strictEqual(hash.length, 32, "SHA-256 output is 32 bytes");
	console.log("PASS: SHA-256 empty string");
}

// SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223...
{
	const bytes = stringToUtf8Bytes("abc");
	const hash = sha256Bytes(bytes);
	assert.strictEqual(hash[0], 0xba);
	assert.strictEqual(hash[1], 0x78);
	assert.strictEqual(hash[2], 0x16);
	console.log("PASS: SHA-256('abc')");
}

// SHA-256("hello world") = b94d27b9934d3e08a52e52d7da7dabfa...
{
	const bytes = stringToUtf8Bytes("hello world");
	const hash = sha256Bytes(bytes);
	assert.strictEqual(hash[0], 0xb9);
	assert.strictEqual(hash[1], 0x4d);
	assert.strictEqual(hash.length, 32);
	console.log("PASS: SHA-256('hello world')");
}

// ── Difficulty Checking ───────────────────────────────────────────

{
	// All zeros should pass any difficulty up to 256
	const hash = new Array(32).fill(0) as number[];
	assert.strictEqual(checkDifficulty(hash, 0), true);
	assert.strictEqual(checkDifficulty(hash, 8), true);
	assert.strictEqual(checkDifficulty(hash, 16), true);
	assert.strictEqual(checkDifficulty(hash, 256), true);
	console.log("PASS: all-zero hash passes all difficulties");
}

{
	// 0x00 0x0F ... — 12 bits (8+4) zero
	const hash = new Array(32).fill(0) as number[];
	hash[1] = 0x0f;
	assert.strictEqual(checkDifficulty(hash, 12), true, "12 bits zero");
	assert.strictEqual(
		checkDifficulty(hash, 13),
		false,
		"13th bit is 1",
	);
	console.log("PASS: partial byte difficulty");
}

{
	// 0xFF ... — 0 bits zero
	const hash = new Array(32).fill(0) as number[];
	hash[0] = 0xff;
	assert.strictEqual(checkDifficulty(hash, 1), false);
	assert.strictEqual(checkDifficulty(hash, 8), false);
	console.log("PASS: non-zero hash fails");
}

// ── UTF-8 Encoding ────────────────────────────────────────────────

{
	const bytes = stringToUtf8Bytes("hello");
	assert.deepStrictEqual(
		bytes,
		[0x68, 0x65, 0x6c, 0x6c, 0x6f],
	);
	console.log("PASS: UTF-8 ASCII");
}

{
	const bytes = stringToUtf8Bytes("\u00e9"); // é
	assert.deepStrictEqual(bytes, [0xc3, 0xa9]);
	console.log("PASS: UTF-8 2-byte char");
}

{
	const bytes = stringToUtf8Bytes("\u20ac"); // €
	assert.deepStrictEqual(bytes, [0xe2, 0x82, 0xac]);
	console.log("PASS: UTF-8 3-byte char");
}

{
	const bytes = stringToUtf8Bytes("\u{1f600}"); // 😀
	assert.deepStrictEqual(bytes, [0xf0, 0x9f, 0x98, 0x80]);
	console.log("PASS: UTF-8 4-byte emoji");
}

// ── End-to-end PoW solving ────────────────────────────────────────

{
	// Solve a difficulty-8 challenge (fast)
	const prefix = "test-prefix-1234";
	const difficulty = 8;

	let nonce = 0;
	let found = false;
	for (; nonce < 1_000_000; nonce++) {
		const input = prefix + String(nonce);
		const bytes = stringToUtf8Bytes(input);
		const hash = sha256Bytes(bytes);
		if (checkDifficulty(hash, difficulty)) {
			found = true;
			break;
		}
	}

	assert.strictEqual(found, true, "PoW solution found");
	assert.ok(nonce > 0, "Nonce should be positive");

	// Verify the solution
	const input = prefix + String(nonce);
	const bytes = stringToUtf8Bytes(input);
	const hash = sha256Bytes(bytes);
	assert.strictEqual(
		checkDifficulty(hash, difficulty),
		true,
		`Found nonce ${nonce} should produce valid hash`,
	);
	console.log(`PASS: PoW solved with nonce=${nonce} (difficulty=${difficulty})`);
}

console.log("\n✅ ALL TESTS PASSED");
