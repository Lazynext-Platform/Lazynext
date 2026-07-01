/**
 * Audio DSP helpers — volume, mute, linear gain, and automation envelope
 * sampling for timeline audio and video elements.
 *
 * @module timeline/audio-state
 */

import { hasKeyframesForPath } from "@/animation/keyframe-query";
import { resolveNumberAtTime } from "@/animation/values";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "./audio-constants";
import type { TimelineElement } from "./types";
const DEFAULT_STEP_SECONDS = 1 / 60;

/** Elements that carry audio — either audio-only or video-with-source-audio. */
export type AudioCapableElement = Extract<
	TimelineElement,
	{ type: "audio" | "video" }
>;

/**
 * Clamps a decibel value to the valid range [VOLUME_DB_MIN, VOLUME_DB_MAX].
 * Non-finite values default to 0 dB.
 */
export function clampDb(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.min(VOLUME_DB_MAX, Math.max(VOLUME_DB_MIN, value));
}

/**
 * Converts a decibel value to a linear gain factor (0–∞).
 */
export function dBToLinear(db: number): number {
	return 10 ** (clampDb(db) / 20);
}

/**
 * Reads the volume parameter from an audio-capable element, defaulting to 0.
 */
export function getElementVolume({
	element,
}: {
	element: AudioCapableElement;
}): number {
	const value = element.params.volume;
	return typeof value === "number" ? value : 0;
}

/**
 * Returns `true` if the element is muted via its `muted` param.
 */
export function isElementMuted({
	element,
}: {
	element: AudioCapableElement;
}): boolean {
	return element.params.muted === true;
}

/**
 * Returns `true` if the element has animated keyframes on the `volume` property.
 */
export function hasAnimatedVolume({
	element,
}: {
	element: AudioCapableElement;
}): boolean {
	return hasKeyframesForPath({
		animations: element.animations,
		propertyPath: "volume",
	});
}

import { TICKS_PER_SECOND } from "@/wasm";

/**
 * Resolves the effective linear gain at a given local time, accounting
 * for track/element mute, volume keyframe animations, and the volume
 * parameter.
 *
 * @returns linear gain (0 = silent).
 */
export function resolveEffectiveAudioGain({
	element,
	trackMuted = false,
	localTime,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	localTime: number;
}): number {
	if (trackMuted || isElementMuted({ element })) {
		return 0;
	}

	const resolvedDb = resolveNumberAtTime({
		baseValue: getElementVolume({ element }),
		animations: element.animations,
		propertyPath: "volume",
		localTime: Math.round(localTime * TICKS_PER_SECOND),
	});

	return dBToLinear(resolvedDb);
}

/**
 * Pre-computes `count` gain samples evenly distributed across the
 * element's duration, used by the waveform renderer.
 */
export function buildWaveformGainSamples({
	element,
	count,
}: {
	element: AudioCapableElement;
	count: number;
}): number[] {
	const durationSeconds = element.duration / TICKS_PER_SECOND;
	return Array.from({ length: count }, (_, i) => {
		const localTime = ((i + 0.5) / count) * durationSeconds;
		return resolveEffectiveAudioGain({ element, localTime });
	});
}

/**
 * Builds a linear-gain automation envelope over a time range, emitting
 * points at `stepSeconds` granularity (defaults to 1/60 s).
 */
export function buildAudioGainAutomation({
	element,
	trackMuted = false,
	fromLocalTime,
	toLocalTime,
	stepSeconds = DEFAULT_STEP_SECONDS,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	fromLocalTime: number;
	toLocalTime: number;
	stepSeconds?: number;
}): Array<{ localTime: number; gain: number }> {
	const startTime = Math.max(0, fromLocalTime);
	const endTime = Math.max(startTime, toLocalTime);
	const safeStep =
		Number.isFinite(stepSeconds) && stepSeconds > 0
			? stepSeconds
			: DEFAULT_STEP_SECONDS;
	const points: Array<{ localTime: number; gain: number }> = [];

	for (let localTime = startTime; localTime < endTime; localTime += safeStep) {
		points.push({
			localTime,
			gain: resolveEffectiveAudioGain({
				element,
				trackMuted,
				localTime,
			}),
		});
	}

	points.push({
		localTime: endTime,
		gain: resolveEffectiveAudioGain({
			element,
			trackMuted,
			localTime: endTime,
		}),
	});

	return points;
}
