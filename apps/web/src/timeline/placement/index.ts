/**
 * Track placement module barrel — re-exports WASM placement wrappers,
 * compatibility checks, insert-index helpers, and track factory.
 *
 * @module timeline/placement
 */

export { applyPlacement, resolveTrackPlacement, placeElementsOnTimeline } from "./wasm-wrappers";
export {
	canElementGoOnTrack,
	validateElementTrackCompatibility,
} from "./compatibility";
export {
	getDefaultInsertIndexForTrack,
	getHighestInsertIndexForTrack,
} from "./insert-index";
export {
	MAIN_TRACK_NAME,
	enforceMainTrackStart,
	getEarliestMainTrackElement,
} from "./main-track";

export { buildEmptyTrack } from "./track-factory";
export type {
	PlacementResult,
	PlacementStrategy,
	PlacementSubject,
	PlacementTimeSpan,
} from "./types";
