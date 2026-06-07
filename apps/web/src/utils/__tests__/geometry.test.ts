import { describe, expect, it } from "bun:test";
import { dimensionToAspectRatio } from "../geometry";

describe("dimensionToAspectRatio", () => {
	it("formats 16:9", () => {
		expect(dimensionToAspectRatio({ width: 1920, height: 1080 })).toBe("16:9");
	});

	it("formats 4:3", () => {
		expect(dimensionToAspectRatio({ width: 1024, height: 768 })).toBe("4:3");
	});

	it("formats 1:1 for square", () => {
		expect(dimensionToAspectRatio({ width: 500, height: 500 })).toBe("1:1");
	});

	it("formats 21:9 ultrawide", () => {
		expect(dimensionToAspectRatio({ width: 2560, height: 1080 })).toBe("64:27");
	});

	it("handles portrait orientation", () => {
		const result = dimensionToAspectRatio({ width: 1080, height: 1920 });
		expect(result).toBe("9:16");
	});
});
