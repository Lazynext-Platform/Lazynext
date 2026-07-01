/** @module __tests__/id Test suite for ID generation utilities */
import { describe, expect, it } from "bun:test";
import { generateUUID } from "../id";

describe("generateUUID", () => {
	it("returns a string", () => {
		expect(typeof generateUUID()).toBe("string");
	});

	it("returns valid UUID format", () => {
		const uuid = generateUUID();
		expect(uuid).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it("generates unique values", () => {
		const ids = new Set(Array.from({ length: 10 }, () => generateUUID()));
		expect(ids.size).toBe(10);
	});

	it("has correct version 4 marker", () => {
		const uuid = generateUUID();
		expect(uuid[14]).toBe("4");
	});
});
