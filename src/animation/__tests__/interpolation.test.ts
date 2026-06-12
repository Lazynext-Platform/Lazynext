import { describe, expect, it } from "bun:test";
import {
	isScalarChannel,
	getScalarSegmentInterpolation,
	getChannelValueAtTime,
	normalizeScalarChannel,
	normalizeDiscreteChannel,
	normalizeChannel,
} from "../interpolation";
import type {
	ScalarAnimationChannel,
	DiscreteAnimationChannel,
	AnimationChannel,
	ScalarAnimationKey,
	DiscreteAnimationKey,
} from "@/animation/types";
import { type MediaTime } from "@/wasm";

// --- Helpers ---

function createScalarKey(overrides?: Partial<ScalarAnimationKey>): ScalarAnimationKey {
	return {
		id: "k1",
		time: 0 as MediaTime,
		value: 0,
		segmentToNext: "linear",
		tangentMode: "flat",
		...overrides,
	};
}

function createScalarChannel(keys: ScalarAnimationKey[]): ScalarAnimationChannel {
	return { keys };
}

function createDiscreteKey(overrides?: Partial<DiscreteAnimationKey>): DiscreteAnimationKey {
	return {
		id: "k1",
		time: 0 as MediaTime,
		value: "hello",
		...overrides,
	};
}

// --- Tests ---

describe("isScalarChannel", () => {
	it("returns true for scalar channel", () => {
		const channel: AnimationChannel = createScalarChannel([createScalarKey()]);
		expect(isScalarChannel(channel)).toBe(true);
	});

	it("returns false for discrete channel", () => {
		const channel: AnimationChannel = {
			keys: [createDiscreteKey()],
		};
		expect(isScalarChannel(channel)).toBe(false);
	});

	it("returns false for channel with non-numeric keys", () => {
		const channel: AnimationChannel = {
			keys: [{ id: "k1", time: 0 as MediaTime, value: true }],
		};
		expect(isScalarChannel(channel)).toBe(false);
	});
});

describe("getScalarSegmentInterpolation", () => {
	it('returns "hold" for step segment', () => {
		expect(getScalarSegmentInterpolation({ segment: "step" })).toBe("hold");
	});

	it('returns "bezier" for bezier segment', () => {
		expect(getScalarSegmentInterpolation({ segment: "bezier" })).toBe("bezier");
	});

	it('returns "linear" for linear segment', () => {
		expect(getScalarSegmentInterpolation({ segment: "linear" })).toBe("linear");
	});

	it('defaults to "linear" for unknown segment', () => {
		expect(getScalarSegmentInterpolation({ segment: "custom" as any })).toBe("linear");
	});
});

describe("normalizeScalarChannel", () => {
	it("sorts keys by time ascending", () => {
		const channel = createScalarChannel([
			createScalarKey({ id: "k3", time: 30 as MediaTime }),
			createScalarKey({ id: "k1", time: 10 as MediaTime }),
			createScalarKey({ id: "k2", time: 20 as MediaTime }),
		]);

		const result = normalizeScalarChannel({ channel });

		expect(result.keys.map((k) => k.id)).toEqual(["k1", "k2", "k3"]);
	});

	it("returns empty channel for empty keys", () => {
		const result = normalizeScalarChannel({ channel: { keys: [] } });
		expect(result.keys).toEqual([]);
	});

	it("preserves channel extrapolation settings", () => {
		const channel: ScalarAnimationChannel = {
			keys: [createScalarKey()],
			extrapolation: { before: "hold", after: "linear" },
		};

		const result = normalizeScalarChannel({ channel });

		expect(result.extrapolation).toEqual({ before: "hold", after: "linear" });
	});
});

describe("normalizeDiscreteChannel", () => {
	it("returns discrete channel unchanged for simple keys", () => {
		const channel: DiscreteAnimationChannel = {
			keys: [createDiscreteKey({ id: "d1", time: 10 as MediaTime })],
		};

		const result = normalizeDiscreteChannel({ channel });

		expect(result.keys).toHaveLength(1);
		expect(result.keys[0]!.id).toBe("d1");
	});

	it("returns empty array for empty keys", () => {
		const result = normalizeDiscreteChannel({ channel: { keys: [] } });
		expect(result.keys).toEqual([]);
	});
});

describe("normalizeChannel", () => {
	it("normalizes scalar channel", () => {
		const channel: AnimationChannel = createScalarChannel([
			createScalarKey({ id: "k2", time: 20 as MediaTime }),
			createScalarKey({ id: "k1", time: 10 as MediaTime }),
		]);

		const result = normalizeChannel({ channel });

		expect(result.keys.map((k) => k.id)).toEqual(["k1", "k2"]);
	});

	it("normalizes discrete channel", () => {
		const channel: AnimationChannel = {
			keys: [createDiscreteKey({ id: "d1", time: 10 as MediaTime })],
		};

		const result = normalizeChannel({ channel });
		expect(result.keys).toHaveLength(1);
	});
});

describe("getChannelValueAtTime", () => {
	it("returns fallback for empty channel", () => {
		const channel: ScalarAnimationChannel = { keys: [] };
		const result = getChannelValueAtTime({
			channel,
			time: 10 as MediaTime,
			fallbackValue: 42,
		});
		expect(result).toBe(42);
	});

	it("returns value at exact key time", () => {
		const channel = createScalarChannel([
			createScalarKey({ id: "k1", time: 0 as MediaTime, value: 100 }),
			createScalarKey({ id: "k2", time: 50 as MediaTime, value: 200 }),
		]);

		const result = getChannelValueAtTime({
			channel,
			time: 50 as MediaTime,
			fallbackValue: 0,
		});

		expect(result).toBe(200);
	});

	it("returns interpolated value between two keys", () => {
		const channel = createScalarChannel([
			createScalarKey({ id: "k1", time: 0 as MediaTime, value: 0, segmentToNext: "linear" }),
			createScalarKey({ id: "k2", time: 100 as MediaTime, value: 100, segmentToNext: "linear" }),
		]);

		const result = getChannelValueAtTime({
			channel,
			time: 50 as MediaTime,
			fallbackValue: 0,
		});

		// Linear interpolation: halfway between 0 and 100
		expect(result).toBeGreaterThan(40);
		expect(result).toBeLessThan(60);
	});

	it("returns first key value for time before first key", () => {
		const channel = createScalarChannel([
			createScalarKey({ id: "k1", time: 10 as MediaTime, value: 50 }),
			createScalarKey({ id: "k2", time: 100 as MediaTime, value: 200 }),
		]);

		const result = getChannelValueAtTime({
			channel,
			time: 5 as MediaTime,
			fallbackValue: 0,
		});

		expect(result).toBe(50);
	});

	it("returns last key value for time after last key", () => {
		const channel = createScalarChannel([
			createScalarKey({ id: "k1", time: 0 as MediaTime, value: 10 }),
			createScalarKey({ id: "k2", time: 100 as MediaTime, value: 200 }),
		]);

		const result = getChannelValueAtTime({
			channel,
			time: 200 as MediaTime,
			fallbackValue: 0,
		});

		expect(result).toBe(200);
	});

	it("returns hold value for hold segment", () => {
		const channel = createScalarChannel([
			createScalarKey({ id: "k1", time: 0 as MediaTime, value: 10, segmentToNext: "step" }),
			createScalarKey({ id: "k2", time: 100 as MediaTime, value: 100, segmentToNext: "step" }),
		]);

		const result = getChannelValueAtTime({
			channel,
			time: 50 as MediaTime,
			fallbackValue: 0,
		});

		// Hold: should be the value of k1 until we reach k2
		expect(result).toBe(10);
	});
});
