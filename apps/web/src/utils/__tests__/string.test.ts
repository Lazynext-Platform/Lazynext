/** @module __tests__/string Test suite for string utilities */
import { describe, expect, it } from "bun:test";
import { capitalizeFirstLetter, uppercase } from "../string";

describe("capitalizeFirstLetter", () => {
	it("capitalizes first letter", () => {
		expect(capitalizeFirstLetter({ string: "hello" })).toBe("Hello");
	});

	it("handles already capitalized", () => {
		expect(capitalizeFirstLetter({ string: "Hello" })).toBe("Hello");
	});

	it("handles single character", () => {
		expect(capitalizeFirstLetter({ string: "a" })).toBe("A");
	});

	it("handles empty string", () => {
		expect(capitalizeFirstLetter({ string: "" })).toBe("");
	});
});

describe("uppercase", () => {
	it("converts to uppercase", () => {
		expect(uppercase({ string: "hello" })).toBe("HELLO");
	});

	it("handles already uppercase", () => {
		expect(uppercase({ string: "HELLO" })).toBe("HELLO");
	});

	it("handles mixed case", () => {
		expect(uppercase({ string: "Hello World" })).toBe("HELLO WORLD");
	});
});
