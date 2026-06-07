import { describe, expect, it } from "bun:test";
import { getKeyframeById, getKeyframeAtTime, getElementKeyframes, hasKeyframesForPath } from "../keyframe-query";
import type { ElementAnimations, ScalarAnimationKey } from "@/animation/types";
import { type MediaTime } from "@/wasm";

// --- Helpers ---

function createScalarKey(overrides?: Partial<ScalarAnimationKey>): ScalarAnimationKey {
	return {
		id: "k1",
		time: 0 as MediaTime,
		value: 100,
		segmentToNext: "linear",
		tangentMode: "flat",
		...overrides,
	};
}

function createTestAnimations(): ElementAnimations {
	return {
		"transform.positionX": {
			keys: [
				createScalarKey({ id: "px1", time: 0 as MediaTime, value: 0 }),
				createScalarKey({ id: "px2", time: 50 as MediaTime, value: 500 }),
			],
		},
		opacity: {
			keys: [
				createScalarKey({ id: "op1", time: 0 as MediaTime, value: 1 }),
				createScalarKey({ id: "op2", time: 100 as MediaTime, value: 0 }),
			],
		},
	};
}

// --- Tests ---

describe("getKeyframeById", () => {
	it("finds keyframe by ID", () => {
		const animations = createTestAnimations();
		const result = getKeyframeById({
			animations,
			propertyPath: "transform.positionX",
			keyframeId: "px2",
		});
		expect(result).not.toBeNull();
		expect(result!.time).toBe(50 as MediaTime);
		expect(result!.value).toBe(500);
	});

	it("returns null for non-existent ID", () => {
		const animations = createTestAnimations();
		expect(getKeyframeById({
			animations,
			propertyPath: "transform.positionX",
			keyframeId: "nonexistent",
		})).toBeNull();
	});

	it("returns null for non-existent property path", () => {
		const animations = createTestAnimations();
		expect(getKeyframeById({
			animations,
			propertyPath: "volume",
			keyframeId: "px1",
		})).toBeNull();
	});

	it("returns null when animations is undefined", () => {
		expect(getKeyframeById({
			animations: undefined,
			propertyPath: "opacity",
			keyframeId: "op1",
		})).toBeNull();
	});
});

describe("getKeyframeAtTime", () => {
	it("finds keyframe at exact time", () => {
		const animations = createTestAnimations();
		const result = getKeyframeAtTime({
			animations,
			propertyPath: "transform.positionX",
			time: 50 as MediaTime,
		});
		expect(result).not.toBeNull();
		expect(result!.id).toBe("px2");
	});

	it("returns null when no keyframe at time", () => {
		const animations = createTestAnimations();
		expect(getKeyframeAtTime({
			animations,
			propertyPath: "transform.positionX",
			time: 25 as MediaTime,
		})).toBeNull();
	});

	it("returns null when animations is undefined", () => {
		expect(getKeyframeAtTime({
			animations: undefined,
			propertyPath: "opacity",
			time: 0 as MediaTime,
		})).toBeNull();
	});
});

describe("getElementKeyframes", () => {
	it("returns all keyframes across property paths", () => {
		const animations = createTestAnimations();
		const keyframes = getElementKeyframes({ animations });
		expect(keyframes.length).toBe(4); // 2 per property path * 2 paths
	});

	it("returns empty array for undefined animations", () => {
		expect(getElementKeyframes({ animations: undefined })).toEqual([]);
	});

	it("includes property path in returned keyframes", () => {
		const animations = createTestAnimations();
		const keyframes = getElementKeyframes({ animations });
		const pxKeys = keyframes.filter(k => k.propertyPath === "transform.positionX");
		expect(pxKeys).toHaveLength(2);
	});
});

describe("hasKeyframesForPath", () => {
	it("returns true for path with keyframes", () => {
		const animations = createTestAnimations();
		expect(hasKeyframesForPath({
			animations,
			propertyPath: "transform.positionX",
		})).toBe(true);
	});

	it("returns false for path without keyframes", () => {
		const animations = createTestAnimations();
		expect(hasKeyframesForPath({
			animations,
			propertyPath: "volume",
		})).toBe(false);
	});

	it("returns false for undefined animations", () => {
		expect(hasKeyframesForPath({
			animations: undefined,
			propertyPath: "opacity",
		})).toBe(false);
	});
});
