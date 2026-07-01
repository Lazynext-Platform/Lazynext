/**
 * Factory helpers for creating new timeline elements with sensible defaults.
 *
 * @module timeline/creation
 */

import { mediaTime, mediaTimeFromSeconds, TICKS_PER_SECOND } from "@/wasm";

/** Default duration (5 seconds in ticks) assigned to newly created elements. */
export const DEFAULT_NEW_ELEMENT_DURATION = mediaTime({
	ticks: 5 * TICKS_PER_SECOND,
});

/**
 * Converts a seconds value to element duration ticks, falling back to
 * {@link DEFAULT_NEW_ELEMENT_DURATION} when `seconds` is null/undefined.
 */
export function toElementDurationTicks({
	seconds,
}: {
	seconds: number | null | undefined;
}) {
	if (seconds == null) {
		return DEFAULT_NEW_ELEMENT_DURATION;
	}

	return mediaTimeFromSeconds({ seconds });
}
