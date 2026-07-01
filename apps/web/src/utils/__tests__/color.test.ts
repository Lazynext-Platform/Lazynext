/** @module __tests__/color Test suite for color utilities */
import { describe, expect, it } from "bun:test";
import { hexToHsv, parseHexAlpha, appendAlpha } from "../color";

describe("hexToHsv", () => {
	it("converts red hex to HSV", () => {
		const [h, s, v] = hexToHsv({ hex: "ff0000" });
		expect(h).toBeCloseTo(0);
		expect(s).toBeCloseTo(1);
		expect(v).toBeCloseTo(1);
	});

	it("converts black to HSV", () => {
		const [_h, _s, v] = hexToHsv({ hex: "000000" });
		expect(v).toBe(0);
	});

	it("returns array of 3 numbers", () => {
		const result = hexToHsv({ hex: "336699" });
		expect(result).toHaveLength(3);
		expect(typeof result[0]).toBe("number");
	});
});

describe("parseHexAlpha", () => {
	it("parses hex with alpha", () => {
		const { rgb, alpha } = parseHexAlpha({ hex: "ff000080" });
		expect(rgb).toBe("ff0000");
		expect(alpha).toBeLessThan(1);
	});

	it("parses hex without alpha", () => {
		const { rgb, alpha } = parseHexAlpha({ hex: "ff0000" });
		expect(rgb).toBe("ff0000");
		expect(alpha).toBe(1);
	});
});

describe("appendAlpha", () => {
	it("returns same hex when alpha is >= 1", () => {
		expect(appendAlpha({ rgbHex: "ff0000", alpha: 1 })).toBe("ff0000");
	});

	it("appends alpha channel when alpha < 1", () => {
		const result = appendAlpha({ rgbHex: "ff0000", alpha: 0.5 });
		expect(result.length).toBe(8);
		expect(result.startsWith("ff0000")).toBe(true);
	});
});
