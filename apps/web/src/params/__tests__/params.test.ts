/** @module __tests__/params Test suite for parameter utilities */
import { describe, expect, it } from "bun:test";
import {
	parseColorToLinearRgba,
	formatLinearRgba,
	getParamValueKind,
	coerceParamValue,
	NUMBER_CHANNEL_LAYOUT,
	BOOLEAN_CHANNEL_LAYOUT,
	STRING_CHANNEL_LAYOUT,
	COLOR_CHANNEL_LAYOUT,
} from "@/params";

// --- Helpers ---

function createNumberParam(overrides?: Record<string, any>): any {
	return {
		type: "number",
		label: "opacity",
		default: 1,
		min: 0,
		max: 1,
		step: 0.01,
		channelLayout: NUMBER_CHANNEL_LAYOUT,
		...overrides,
	} as any;
}

function createBooleanParam(): any {
	return {
		type: "boolean",
		label: "visible",
		default: true,
		key: "visible",
		channelLayout: BOOLEAN_CHANNEL_LAYOUT,
	};
}

// --- Tests ---

describe("parseColorToLinearRgba", () => {
	it("parses hex red correctly", () => {
		const result = parseColorToLinearRgba({ color: "#ff0000" });
		expect(result).not.toBeNull();
		expect(result!.r).toBe(1);
		expect(result!.g).toBe(0);
		expect(result!.b).toBe(0);
		expect(result!.a).toBe(1);
	});

	it("parses hex green correctly", () => {
		const result = parseColorToLinearRgba({ color: "#00ff00" });
		expect(result).not.toBeNull();
		expect(result!.g).toBe(1);
	});

	it("parses hex blue correctly", () => {
		const result = parseColorToLinearRgba({ color: "#0000ff" });
		expect(result).not.toBeNull();
		expect(result!.b).toBe(1);
	});

	it("parses white correctly", () => {
		const result = parseColorToLinearRgba({ color: "#ffffff" });
		expect(result).not.toBeNull();
		expect(result!.r).toBe(1);
		expect(result!.g).toBe(1);
		expect(result!.b).toBe(1);
	});

	it("parses black correctly", () => {
		const result = parseColorToLinearRgba({ color: "#000000" });
		expect(result).not.toBeNull();
		expect(result!.r).toBe(0);
		expect(result!.g).toBe(0);
		expect(result!.b).toBe(0);
	});

	it("returns null for invalid color string", () => {
		expect(parseColorToLinearRgba({ color: "not-a-color" })).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseColorToLinearRgba({ color: "" })).toBeNull();
	});

	it("parses hex with alpha", () => {
		const result = parseColorToLinearRgba({ color: "#ff000080" });
		expect(result).not.toBeNull();
		expect(result!.a).toBeLessThan(1);
	});
});

describe("formatLinearRgba", () => {
	it("formats red to hex", () => {
		const result = formatLinearRgba({ color: { r: 1, g: 0, b: 0, a: 1 } });
		expect(result).toBe("#ff0000");
	});

	it("formats green to hex", () => {
		const result = formatLinearRgba({ color: { r: 0, g: 1, b: 0, a: 1 } });
		expect(result).toBe("#00ff00");
	});

	it("formats blue to hex", () => {
		const result = formatLinearRgba({ color: { r: 0, g: 0, b: 1, a: 1 } });
		expect(result).toBe("#0000ff");
	});

	it("formats black to hex", () => {
		const result = formatLinearRgba({ color: { r: 0, g: 0, b: 0, a: 1 } });
		expect(result).toBe("#000000");
	});

	it("formats white to hex", () => {
		const result = formatLinearRgba({ color: { r: 1, g: 1, b: 1, a: 1 } });
		expect(result).toBe("#ffffff");
	});

	it("clamps out-of-range values", () => {
		const result = formatLinearRgba({ color: { r: 2, g: -1, b: 0.5, a: 1.5 } });
		expect(result).toMatch(/^#[0-9a-f]{6}$/);
	});
});

describe("getParamValueKind", () => {
	it('returns "number" for numeric params', () => {
		expect(getParamValueKind({ param: createNumberParam() })).toBe("number");
	});

	it('returns "discrete" for boolean params', () => {
		expect(getParamValueKind({ param: createBooleanParam() })).toBe("discrete");
	});
});

describe("coerceParamValue", () => {
	it("coerces valid number value", () => {
		const param = createNumberParam();
		const result = coerceParamValue({ param, value: 0.5 });
		expect(result).toBe(0.5);
	});

	it("returns null for invalid number value", () => {
		const param = createNumberParam();
		expect(coerceParamValue({ param, value: "not-a-number" })).toBeNull();
		expect(coerceParamValue({ param, value: NaN })).toBeNull();
	});

	it("coerces valid boolean value", () => {
		const param = createBooleanParam();
		expect(coerceParamValue({ param, value: true })).toBe(true);
		expect(coerceParamValue({ param, value: false })).toBe(false);
	});

	it("returns null for invalid boolean value", () => {
		const param = createBooleanParam();
		expect(coerceParamValue({ param, value: "yes" })).toBeNull();
	});
});

describe("channel layouts", () => {
	it("NUMBER_CHANNEL_LAYOUT is a leaf layout", () => {
		expect(NUMBER_CHANNEL_LAYOUT.kind).toBe("leaf");
	});

	it("BOOLEAN_CHANNEL_LAYOUT is a leaf layout", () => {
		expect(BOOLEAN_CHANNEL_LAYOUT.kind).toBe("leaf");
	});

	it("STRING_CHANNEL_LAYOUT is a leaf layout", () => {
		expect(STRING_CHANNEL_LAYOUT.kind).toBe("leaf");
	});

	it("COLOR_CHANNEL_LAYOUT is a composite layout", () => {
		expect(COLOR_CHANNEL_LAYOUT.kind).toBe("composite");
	});
});
