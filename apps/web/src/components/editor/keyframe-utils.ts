/**
 * @module Keyframe utilities — Keyframe interpolation utilities for the editor,
 * including cubic bezier evaluation, sorted keyframe caching, and expression-based
 * property animation with WASM-accelerated fallback for heavy computation.
 */
import { solveCubicBezier } from "@/utils/math";

// ── Caches to avoid O(n log n) per-frame and repeated Function compilation ──

/** Cache sorted, property-filtered keyframe arrays per clip. Cleared when clip changes. */
const sortedKfsCache = new WeakMap<object, Map<string, unknown[]>>();

/** Cache compiled expression functions. Cleared on memory pressure. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ExprFunction = (time: number, value: number, math: typeof Math) => number;
const exprFnCache = new Map<string, ExprFunction>();

function getSortedKfs(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	clip: any,
	property: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] | null {
	if (!clip?.keyframes) return null;
	let propMap = sortedKfsCache.get(clip);
	if (!propMap) {
		propMap = new Map();
		sortedKfsCache.set(clip, propMap);
	}
	if (propMap.has(property)) {
		return propMap.get(property)!;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const kfs = clip.keyframes.filter((k: any) => k.property === property);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	kfs.sort((a: any, b: any) => a.frame - b.frame);
	propMap.set(property, kfs);
	return kfs;
}

function getCachedExprFn(expr: string): ExprFunction {
	const cached = exprFnCache.get(expr);
	if (cached) return cached;
	const fn = new Function(
		"time",
		"value",
		"Math",
		`return ${expr};`,
	) as ExprFunction;
	// Limit cache size to avoid unbounded memory growth
	if (exprFnCache.size > 500) {
		const firstKey = exprFnCache.keys().next().value;
		if (firstKey !== undefined) exprFnCache.delete(firstKey);
	}
	exprFnCache.set(expr, fn);
	return fn;
}

// ── Public API ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getKeyframedValue({
	clip,
	property,
	defaultValue,
	frame,
}: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	clip: any;
	property: string;
	defaultValue: number;
	frame: number;
}): number {
	let baseValue = defaultValue;
	const kfs = getSortedKfs(clip, property);
	if (kfs && kfs.length > 0) {
		const relativeFrame = frame - clip.start_frame;
		if (relativeFrame <= kfs[0].frame) {
			baseValue = kfs[0].value;
		} else if (relativeFrame >= kfs[kfs.length - 1].frame) {
			baseValue = kfs[kfs.length - 1].value;
		} else {
			for (let i = 0; i < kfs.length - 1; i++) {
				const k1 = kfs[i];
				const k2 = kfs[i + 1];
				if (relativeFrame >= k1.frame && relativeFrame < k2.frame) {
					if (k1.easing === "step") {
						baseValue = k1.value;
						break;
					}
					let progress = (relativeFrame - k1.frame) / (k2.frame - k1.frame);

					let bz = [0, 0, 1, 1];
					if (k1.easing === "ease-in") bz = [0.42, 0, 1, 1];
					else if (k1.easing === "ease-out") bz = [0, 0, 0.58, 1];
					else if (k1.easing === "ease-in-out") bz = [0.42, 0, 0.58, 1];
					else if (k1.easing === "custom" && k1.bezierCurve?.length === 4)
						bz = k1.bezierCurve;

					if (k1.easing && k1.easing !== "linear" && k1.easing !== "step") {
						progress = solveCubicBezier({
							p: progress,
							p1x: bz[0],
							p1y: bz[1],
							p2x: bz[2],
							p2y: bz[3],
						});
					}

					baseValue = k1.value + (k2.value - k1.value) * progress;
					break;
				}
			}
		}
	}

	if (clip?.expressions?.[property]) {
		try {
			const time = (frame - clip.start_frame) / 60;
			const fn = getCachedExprFn(clip.expressions[property]);
			return fn(time, baseValue, Math) as number;
		} catch (e) {
			console.error("Expression error on property", property, e);
		}
	}

	return baseValue;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasKeyframe({
	clip,
	property,
	frame,
}: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	clip: any;
	property: string;
	frame: number;
}): boolean {
	if (!clip?.keyframes) return false;
	const relativeFrame = frame - clip.start_frame;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return clip.keyframes.some(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(k: any) =>
			k.property === property && Math.abs(k.frame - relativeFrame) < 0.5,
	);
}
