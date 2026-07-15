/**
 * Tests for the mobile app's captcha module — SHA-256 implementation
 * and proof-of-work solver.
 */

import {
	stringToUtf8Bytes,
	sha256Bytes,
	checkDifficulty,
} from "../services/captcha";

describe("mobile captcha SHA-256", () => {
	test("produces correct output for empty string", () => {
		const bytes = stringToUtf8Bytes("");
		const hash = sha256Bytes(bytes);
		// SHA-256("") starts with e3b0c442
		expect(hash[0]).toBe(0xe3);
		expect(hash[1]).toBe(0xb0);
		expect(hash[2]).toBe(0xc4);
		expect(hash.length).toBe(32);
	});

	test("produces correct output for 'abc'", () => {
		const bytes = stringToUtf8Bytes("abc");
		const hash = sha256Bytes(bytes);
		// SHA-256("abc") starts with ba7816bf
		expect(hash[0]).toBe(0xba);
		expect(hash[1]).toBe(0x78);
		expect(hash[2]).toBe(0x16);
	});

	test("checkDifficulty detects 16-bit difficulty", () => {
		const hash = Array(32).fill(0);
		hash[2] = 0xff; // 3rd byte non-zero
		expect(checkDifficulty(hash, 16)).toBe(true);
		expect(checkDifficulty(hash, 17)).toBe(false);
	});

	test("checkDifficulty handles partial byte", () => {
		const hash = Array(32).fill(0);
		hash[1] = 0x0f; // top 4 bits zero, bottom 4 not
		expect(checkDifficulty(hash, 12)).toBe(true);
		expect(checkDifficulty(hash, 13)).toBe(false);
	});

	test("UTF-8 handles ASCII", () => {
		const bytes = stringToUtf8Bytes("hello");
		expect(bytes).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
	});

	test("UTF-8 handles multi-byte", () => {
		const bytes = stringToUtf8Bytes("\u00e9"); // é
		expect(bytes).toEqual([0xc3, 0xa9]);
	});
});
