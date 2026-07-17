/** @module Retime rate constants and clamping utilities for playback speed control */
export const DEFAULT_RETIME_RATE = 1;
/** Utility representing MIN_RETIME_RATE. */
export const MIN_RETIME_RATE = 0.01;
/** Utility representing MAX_RETIME_RATE. */
export const MAX_RETIME_RATE = 5;

/** Utility representing clampRetimeRate. */
export function clampRetimeRate({ rate }: { rate: number }): number {
	if (!Number.isFinite(rate) || rate <= 0) {
		return DEFAULT_RETIME_RATE;
	}

	return Math.min(Math.max(rate, MIN_RETIME_RATE), MAX_RETIME_RATE);
}

/** Utility representing canMaintainPitch. */
export function canMaintainPitch({ rate }: { rate: number }): boolean {
	return Number.isFinite(rate) && rate > 0;
}

/** Utility representing shouldMaintainPitch. */
export function shouldMaintainPitch({
	rate,
	maintainPitch,
}: {
	rate: number;
	maintainPitch?: boolean;
}): boolean {
	return maintainPitch === true && canMaintainPitch({ rate });
}
