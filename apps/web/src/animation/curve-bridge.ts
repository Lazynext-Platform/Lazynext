/** @module animation/curve-bridge Bridges WASM easing-curve evaluation to the TS animation system. */

import type {
	CurveHandle,
	NormalizedCubicBezier,
	ScalarAnimationKey,
} from "@/animation/types";
import { roundMediaTime } from "@/wasm";

const VALUE_EPSILON = 1e-6;

function clamp01({ value }: { value: number }): number {
	return Math.max(0, Math.min(1, value));
}

export function getDefaultRightHandle({
	leftKey,
	rightKey,
}: {
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}) {
	const span = rightKey.time - leftKey.time;
	const valueDelta = rightKey.value - leftKey.value;
	return {
		dt: span / 3,
		dv: valueDelta / 3,
	};
}

export function getDefaultLeftHandle({
	leftKey,
	rightKey,
}: {
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}) {
	const span = rightKey.time - leftKey.time;
	const valueDelta = rightKey.value - leftKey.value;
	return {
		dt: -span / 3,
		dv: -valueDelta / 3,
	};
}

export function getNormalizedCubicBezierForScalarSegment({
	leftKey,
	rightKey,
	referenceSpanValue,
}: {
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
	/** Fallback Y-axis scale used when the segment is flat (spanValue ≈ 0). */
	referenceSpanValue?: number;
}): NormalizedCubicBezier | null {
	const spanTime = rightKey.time - leftKey.time;
	const spanValue = rightKey.value - leftKey.value;
	const effectiveSpanValue =
		Math.abs(spanValue) > VALUE_EPSILON
			? spanValue
			: referenceSpanValue !== undefined &&
				  Math.abs(referenceSpanValue) > VALUE_EPSILON
				? referenceSpanValue
				: null;

	if (spanTime === 0 || effectiveSpanValue === null) {
		return null;
	}

	const rightHandle =
		leftKey.rightHandle ?? getDefaultRightHandle({ leftKey, rightKey });
	const leftHandle =
		rightKey.leftHandle ?? getDefaultLeftHandle({ leftKey, rightKey });

	return [
		clamp01({ value: rightHandle.dt / spanTime }),
		rightHandle.dv / effectiveSpanValue,
		clamp01({ value: 1 + leftHandle.dt / spanTime }),
		1 + leftHandle.dv / effectiveSpanValue,
	];
}

export function getCurveHandlesForNormalizedCubicBezier({
	leftKey,
	rightKey,
	cubicBezier,
	referenceSpanValue,
}: {
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
	cubicBezier: NormalizedCubicBezier;
	/** Fallback Y-axis scale used when the segment is flat (spanValue ≈ 0). */
	referenceSpanValue?: number;
}): {
	rightHandle: CurveHandle;
	leftHandle: CurveHandle;
} | null {
	const spanTime = rightKey.time - leftKey.time;
	const spanValue = rightKey.value - leftKey.value;
	const effectiveSpanValue =
		Math.abs(spanValue) > VALUE_EPSILON
			? spanValue
			: referenceSpanValue !== undefined &&
				  Math.abs(referenceSpanValue) > VALUE_EPSILON
				? referenceSpanValue
				: null;

	if (spanTime === 0 || effectiveSpanValue === null) {
		return null;
	}

	const [rawX1, y1, rawX2, y2] = cubicBezier;
	const x1 = clamp01({ value: rawX1 });
	const x2 = clamp01({ value: rawX2 });

	return {
		rightHandle: {
			dt: roundMediaTime({ time: spanTime * x1 }),
			dv: effectiveSpanValue * y1,
		},
		leftHandle: {
			dt: roundMediaTime({ time: spanTime * (x2 - 1) }),
			dv: effectiveSpanValue * (y2 - 1),
		},
	};
}

const BEZIER_SOLVE_ITERATIONS = 20;

export function getBezierPoint({
	progress,
	p0,
	p1,
	p2,
	p3,
}: {
	progress: number;
	p0: number;
	p1: number;
	p2: number;
	p3: number;
}) {
	const mt = 1 - progress;
	return (
		mt * mt * mt * p0 +
		3 * mt * mt * progress * p1 +
		3 * mt * progress * progress * p2 +
		progress * progress * progress * p3
	);
}

export function solveBezierProgressForTime({
	time,
	leftKey,
	rightKey,
}: {
	time: number;
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}) {
	let lower = 0;
	let upper = 1;
	const rightHandle =
		leftKey.rightHandle ?? getDefaultRightHandle({ leftKey, rightKey });
	const leftHandle =
		rightKey.leftHandle ?? getDefaultLeftHandle({ leftKey, rightKey });

	for (let iteration = 0; iteration < BEZIER_SOLVE_ITERATIONS; iteration++) {
		const mid = (lower + upper) / 2;
		const estimate = getBezierPoint({
			progress: mid,
			p0: leftKey.time,
			p1: leftKey.time + rightHandle.dt,
			p2: rightKey.time + leftHandle.dt,
			p3: rightKey.time,
		});
		if (estimate < time) {
			lower = mid;
		} else {
			upper = mid;
		}
	}

	return (lower + upper) / 2;
}
