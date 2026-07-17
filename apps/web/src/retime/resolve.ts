/** @module Retime resolution for mapping between clip time and source time with keyframe support */
import type { RetimeConfig } from "@/timeline";
import { clampRetimeRate } from "@/retime/rate";

function getSafeRate({ rate }: { rate: number }): number {
	return clampRetimeRate({ rate });
}

/** Utility representing getSourceTimeAtClipTime. */
export function getSourceTimeAtClipTime({
	clipTime,
	retime,
}: {
	clipTime: number;
	retime?: RetimeConfig;
}): number {
	return clipTime * getSafeRate({ rate: retime?.rate ?? 1 });
}

/** Utility representing getClipTimeAtSourceTime. */
export function getClipTimeAtSourceTime({
	sourceTime,
	retime,
}: {
	sourceTime: number;
	retime?: RetimeConfig;
}): number {
	return sourceTime / getSafeRate({ rate: retime?.rate ?? 1 });
}

/** Utility representing getEffectiveRateAt. */
export function getEffectiveRateAt({
	retime,
}: {
	clipTime?: number;
	retime?: RetimeConfig;
}): number {
	return getSafeRate({ rate: retime?.rate ?? 1 });
}

/** Utility representing getTimelineDurationForSourceSpan. */
export function getTimelineDurationForSourceSpan({
	sourceSpan,
	retime,
}: {
	sourceSpan: number;
	retime?: RetimeConfig;
}): number {
	if (sourceSpan <= 0) {
		return 0;
	}
	return sourceSpan / getSafeRate({ rate: retime?.rate ?? 1 });
}
