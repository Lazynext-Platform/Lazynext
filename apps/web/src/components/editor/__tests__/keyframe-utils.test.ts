/** @module __tests__/keyframe-utils Test suite for keyframe utility functions */
import { describe, it, expect } from "bun:test";
import { getKeyframedValue, hasKeyframe } from "../keyframe-utils";

// ── Helpers ──

function makeClip(overrides?: Record<string, unknown>) {
	return {
		id: "clip-1",
		start_frame: 0,
		duration_frames: 120,
		type: "video",
		keyframes: [],
		...overrides,
	};
}

// ── Tests ──

describe("getKeyframedValue", () => {
	it("returns defaultValue when clip has no keyframes", () => {
		expect(
			getKeyframedValue({
				clip: makeClip(),
				property: "opacity",
				defaultValue: 1.0,
				frame: 30,
			}),
		).toBe(1.0);
	});

	it("returns defaultValue when property has no keyframes", () => {
		expect(
			getKeyframedValue({
				clip: makeClip({
					keyframes: [{ frame: 0, property: "scale", value: 1.5 }],
				}),
				property: "opacity",
				defaultValue: 1.0,
				frame: 30,
			}),
		).toBe(1.0);
	});

	it("returns first keyframe value when frame is before first keyframe", () => {
		expect(
			getKeyframedValue({
				clip: makeClip({
					start_frame: 10,
					keyframes: [
						{ frame: 20, property: "opacity", value: 0.5 },
						{ frame: 40, property: "opacity", value: 0.8 },
					],
				}),
				property: "opacity",
				defaultValue: 1.0,
				frame: 15, // relative frame = 5, before k1 at frame 20
			}),
		).toBe(0.5);
	});

	it("returns last keyframe value when frame is after last keyframe", () => {
		expect(
			getKeyframedValue({
				clip: makeClip({
					start_frame: 0,
					keyframes: [
						{ frame: 20, property: "opacity", value: 0.5 },
						{ frame: 40, property: "opacity", value: 0.8 },
					],
				}),
				property: "opacity",
				defaultValue: 1.0,
				frame: 60,
			}),
		).toBe(0.8);
	});

	it("linearly interpolates between two keyframes", () => {
		expect(
			getKeyframedValue({
				clip: makeClip({
					start_frame: 0,
					keyframes: [
						{ frame: 0, property: "opacity", value: 0 },
						{ frame: 100, property: "opacity", value: 1 },
					],
				}),
				property: "opacity",
				defaultValue: 0,
				frame: 50,
			}),
		).toBe(0.5);
	});

	it("handles step easing (no interpolation)", () => {
		expect(
			getKeyframedValue({
				clip: makeClip({
					start_frame: 0,
					keyframes: [
						{ frame: 0, property: "opacity", value: 0, easing: "step" },
						{ frame: 100, property: "opacity", value: 1 },
					],
				}),
				property: "opacity",
				defaultValue: 0,
				frame: 50,
			}),
		).toBe(0);
	});

	it("handles ease-in-out with cubic bezier", () => {
		const val = getKeyframedValue({
			clip: makeClip({
				start_frame: 0,
				keyframes: [
					{ frame: 0, property: "x", value: 0, easing: "ease-in-out" },
					{ frame: 100, property: "x", value: 100 },
				],
			}),
			property: "x",
			defaultValue: 0,
			frame: 50,
		});
		// ease-in-out at t=0.5 gives ~50, but bezier modifies it
		expect(val).toBeGreaterThan(0);
		expect(val).toBeLessThan(100);
	});

	it("caches sorted keyframes (calling twice returns same result)", () => {
		const clip = makeClip({
			start_frame: 0,
			keyframes: [
				{ frame: 100, property: "opacity", value: 1 },
				{ frame: 0, property: "opacity", value: 0 },
			],
		});
		const a = getKeyframedValue({
			clip,
			property: "opacity",
			defaultValue: 0,
			frame: 50,
		});
		const b = getKeyframedValue({
			clip,
			property: "opacity",
			defaultValue: 0,
			frame: 50,
		});
		expect(a).toBe(b);
		expect(a).toBe(0.5);
	});
});

describe("hasKeyframe", () => {
	it("returns false when clip is null", () => {
		expect(hasKeyframe({ clip: null, property: "opacity", frame: 0 })).toBe(
			false,
		);
	});

	it("returns false when clip has no keyframes", () => {
		expect(
			hasKeyframe({ clip: makeClip(), property: "opacity", frame: 0 }),
		).toBe(false);
	});

	it("returns true when an exact keyframe exists at the relative frame", () => {
		expect(
			hasKeyframe({
				clip: makeClip({
					start_frame: 10,
					keyframes: [{ frame: 20, property: "opacity", value: 0.5 }],
				}),
				property: "opacity",
				frame: 30, // relative frame = 20, matches keyframe
			}),
		).toBe(true);
	});

	it("returns false when no keyframe at relative frame", () => {
		expect(
			hasKeyframe({
				clip: makeClip({
					start_frame: 10,
					keyframes: [{ frame: 20, property: "opacity", value: 0.5 }],
				}),
				property: "opacity",
				frame: 40,
			}),
		).toBe(false);
	});
});
