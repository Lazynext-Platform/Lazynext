/** @module Retime preset builders for constant and keyframed playback speed configurations */
import type { RetimeConfig } from "@/timeline";
import { clampRetimeRate } from "@/retime/rate";

/** Utility representing buildConstantRetime. */
export function buildConstantRetime({
	rate,
	maintainPitch = false,
}: {
	rate: number;
	maintainPitch?: boolean;
}): RetimeConfig {
	return { rate: clampRetimeRate({ rate }), maintainPitch };
}
