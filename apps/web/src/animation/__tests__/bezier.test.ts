import { describe, expect, it } from "bun:test";
import {
	getBezierPoint,
	getDefaultRightHandle,
	getDefaultLeftHandle,
	solveBezierProgressForTime,
} from "../bezier";
import type { ScalarAnimationKey } from "@/animation/types";
import { type MediaTime } from "@/wasm";

function createKey(overrides?: Partial<ScalarAnimationKey>): ScalarAnimationKey {
	return {
		id: "k1",
		time: 0 as MediaTime,
		value: 0,
		segmentToNext: "linear",
		tangentMode: "flat",
		...overrides,
	};
}

describe("getBezierPoint", () => {
	it("returns start point at progress=0", () => {
		expect(getBezierPoint({ progress: 0, p0: 10, p1: 20, p2: 30, p3: 40 })).toBe(10);
	});

	it("returns end point at progress=1", () => {
		expect(getBezierPoint({ progress: 1, p0: 10, p1: 20, p2: 30, p3: 40 })).toBe(40);
	});

	it("returns midpoint for symmetric curve", () => {
		const result = getBezierPoint({ progress: 0.5, p0: 0, p1: 0, p2: 1, p3: 1 });
		expect(result).toBe(0.5);
	});

	it("is monotonic for ease-in-out curve", () => {
		let prev = -Infinity;
		for (let i = 0; i <= 10; i++) {
			const val = getBezierPoint({ progress: i / 10, p0: 0, p1: 0.42, p2: 0.58, p3: 1 });
			expect(val).toBeGreaterThanOrEqual(prev);
			prev = val;
		}
	});
});

describe("getDefaultRightHandle", () => {
	it("computes handle between two keyframes", () => {
		const leftKey = createKey({ time: 0 as MediaTime, value: 0 });
		const rightKey = createKey({ time: 90 as MediaTime, value: 100 });
		const result = getDefaultRightHandle({ leftKey, rightKey });
		expect(result.dt).toBe(30 as MediaTime);
		expect(result.dv).toBeCloseTo(33.33, 0);
	});
});

describe("getDefaultLeftHandle", () => {
	it("computes negative handle between two keyframes", () => {
		const leftKey = createKey({ time: 0 as MediaTime, value: 0 });
		const rightKey = createKey({ time: 90 as MediaTime, value: 100 });
		const result = getDefaultLeftHandle({ leftKey, rightKey });
		expect(result.dt).toBe(-30 as MediaTime);
		expect(result.dv).toBeCloseTo(-33.33, 0);
	});
});

describe("solveBezierProgressForTime", () => {
	it("returns ~0 for time at left key", () => {
		const leftKey = createKey({ time: 0 as MediaTime, value: 0 });
		const rightKey = createKey({ id: "k2", time: 100 as MediaTime, value: 100, segmentToNext: "linear", tangentMode: "flat" });
		const result = solveBezierProgressForTime({ time: 0, leftKey, rightKey });
		expect(result).toBeCloseTo(0);
	});

	it("returns ~1 for time at right key", () => {
		const leftKey = createKey({ time: 0 as MediaTime, value: 0 });
		const rightKey = createKey({ id: "k2", time: 100 as MediaTime, value: 100, segmentToNext: "linear", tangentMode: "flat" });
		const result = solveBezierProgressForTime({ time: 100, leftKey, rightKey });
		expect(result).toBeCloseTo(1);
	});

	it("returns progress for time between keys", () => {
		const leftKey = createKey({ time: 0 as MediaTime, value: 0 });
		const rightKey = createKey({ id: "k2", time: 100 as MediaTime, value: 100, segmentToNext: "linear", tangentMode: "flat" });
		const result = solveBezierProgressForTime({ time: 50, leftKey, rightKey });
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThan(1);
	});
});
