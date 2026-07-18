/** @module Media time utilities bridged from lazynext-wasm — branded integer-tick time type, frame rounding, timecode parsing, and frame-accurate seek operations. */
import {
	lastFrameTime as _lastFrameTime,
	parseTimecode as _parseTimecode,
	roundToFrame as _roundToFrame,
	snappedSeekTime as _snappedSeekTime,
	mediaTimeFromSeconds as _mediaTimeFromSeconds,
	mediaTimeToSeconds as _mediaTimeToSeconds,
	type FrameRate,
	type TimeCodeFormat,
} from "lazynext-wasm";

/**
 * Integer-tick time. Mirrors `MediaTime(i64)` in `rust/crates/time/src/media_time.rs`.
 *
 * `lazynext-wasm` exposes `MediaTime` as a bare `number` alias because tsify
 * collapses tuple structs. The brand here is the TS-side discipline that
 * recovers the invariant: a `MediaTime` is an integer count of ticks, and the
 * only legal way to construct one from a fractional `number` is `roundMediaTime`
 * (or `mediaTimeFromSeconds`, which rounds inside the wasm boundary).
 *
 * Reading is free — `MediaTime` is assignable to `number`. Writing is gated —
 * a bare `number` is not assignable to `MediaTime`.
 */
export type MediaTime = number & { readonly __mediaTime: unique symbol };

/** Utility representing TICKS_PER_SECOND. */
export const TICKS_PER_SECOND = 120_000; // Mirrors rust/crates/time/src/media_time.rs

/** Utility representing isMediaTime. */
function isMediaTime(value: number): value is MediaTime {
	return Number.isInteger(value);
}

/** Utility representing requireMediaTime. */
function requireMediaTime({
	value,
	context,
}: {
	value: number;
	context: string;
}): MediaTime {
	if (!isMediaTime(value)) {
		throw new Error(`${context}: expected an integer tick count, got ${value}`);
	}
	return value;
}

/** Utility representing ZERO_MEDIA_TIME. */
export const ZERO_MEDIA_TIME = requireMediaTime({
	value: 0,
	context: "ZERO_MEDIA_TIME",
});

/**
 * Construct a `MediaTime` from a known-integer tick count. Use `roundMediaTime`
 * when the input may be fractional.
 */
export function mediaTime({ ticks }: { ticks: number }): MediaTime {
	return requireMediaTime({
		value: ticks,
		context: "mediaTime()",
	});
}

/**
 * Project a fractional value onto the integer-tick lattice.
 *
 * Rounds half away from zero (`-1.5 → -2`, `1.5 → 2`) and normalises `-0` to
 * `0`. The away-from-zero rule matches Rust's `.round()` and avoids the
 * `Math.round(-0.5) === -0` quirk that propagates `-0` into stored data.
 */
export function roundMediaTime({ time }: { time: number }): MediaTime {
	const roundedMagnitude = Math.round(Math.abs(time));
	if (roundedMagnitude === 0) {
		return ZERO_MEDIA_TIME;
	}
	return requireMediaTime({
		value: time < 0 ? -roundedMagnitude : roundedMagnitude,
		context: "roundMediaTime()",
	});
}

/** Utility representing mediaTimeFromSeconds. */
export function mediaTimeFromSeconds({
	seconds,
}: {
	seconds: number;
}): MediaTime {
	const result = _mediaTimeFromSeconds({ seconds });
	if (result === undefined) {
		throw new Error(
			`mediaTimeFromSeconds: rust returned undefined for seconds=${seconds}`,
		);
	}
	return requireMediaTime({
		value: result,
		context: "mediaTimeFromSeconds()",
	});
}

/** Utility representing mediaTimeToSeconds. */
export function mediaTimeToSeconds({ time }: { time: MediaTime }): number {
	return _mediaTimeToSeconds({ time });
}

/**
 * Sum `MediaTime` values. Inputs are integer ticks, so the sum is integer too.
 */
export function addMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return requireMediaTime({
		value: a + b,
		context: "addMediaTime()",
	});
}

/** Utility representing subMediaTime. */
export function subMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return requireMediaTime({
		value: a - b,
		context: "subMediaTime()",
	});
}

/** Utility representing maxMediaTime. */
export function maxMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return a > b ? a : b;
}

/** Utility representing minMediaTime. */
export function minMediaTime({
	a,
	b,
}: {
	a: MediaTime;
	b: MediaTime;
}): MediaTime {
	return a < b ? a : b;
}

/** Utility representing clampMediaTime. */
export function clampMediaTime({
	time,
	min,
	max,
}: {
	time: MediaTime;
	min: MediaTime;
	max: MediaTime;
}): MediaTime {
	if (time < min) return min;
	if (time > max) return max;
	return time;
}

/** Utility representing roundFrameTime. */
export function roundFrameTime({
	time,
	fps,
}: {
	time: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return requireMediaTime({
		value: _roundToFrame({ time, rate: fps }) ?? time,
		context: "roundFrameTime()",
	});
}

/** Utility representing roundFrameTicks. */
export function roundFrameTicks({
	ticks,
	fps,
}: {
	ticks: number;
	fps: FrameRate;
}): number {
	return _roundToFrame({ time: ticks, rate: fps }) ?? ticks;
}

/** Utility representing snapSeekMediaTime. */
export function snapSeekMediaTime({
	time,
	duration,
	fps,
}: {
	time: MediaTime;
	duration: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return requireMediaTime({
		value: _snappedSeekTime({ time, duration, rate: fps }) ?? time,
		context: "snapSeekMediaTime()",
	});
}

/** Utility representing lastFrameMediaTime. */
export function lastFrameMediaTime({
	duration,
	fps,
}: {
	duration: MediaTime;
	fps: FrameRate;
}): MediaTime {
	return requireMediaTime({
		value: _lastFrameTime({ duration, rate: fps }) ?? duration,
		context: "lastFrameMediaTime()",
	});
}

/** Utility representing parseMediaTimecode. */
export function parseMediaTimecode({
	timeCode,
	format,
	fps,
}: {
	timeCode: string;
	format: TimeCodeFormat;
	fps: FrameRate;
}): MediaTime | null {
	const parsedTime = _parseTimecode({ timeCode, format, rate: fps });
	if (parsedTime == null) {
		return null;
	}
	return requireMediaTime({
		value: parsedTime,
		context: "parseMediaTimecode()",
	});
}
