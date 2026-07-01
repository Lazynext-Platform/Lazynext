/**
 * Emits snap points at the current playhead position for seek snapping.
 *
 * @module timeline/playhead-snap-source
 */

import type { SnapPoint } from "@/timeline/snapping";
import type { MediaTime } from "@/wasm";

/**
 * Returns a single playhead-type snap point at the given time.
 *
 * @param playheadTime - the current playhead position.
 * @returns a single-element snap point array.
 */
export function getPlayheadSnapPoints({
	playheadTime,
}: {
	playheadTime: MediaTime;
}): SnapPoint[] {
	return [{ time: playheadTime, type: "playhead" }];
}
