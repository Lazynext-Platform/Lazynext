import {
	applyPlacement as wasmApplyPlacement,
	resolveTrackPlacement as wasmResolveTrackPlacement,
	placeElementsOnTimeline as wasmPlaceElementsOnTimeline,
} from "lazynext-wasm";
import type {
	PlacementResult,
	PlacementStrategy,
	PlacementSubject,
	PlacementTimeSpan,
} from "./types";
import type { SceneTracks, TimelineElement } from "@/timeline";

export function resolveTrackPlacement({
	tracks,
	timeSpans,
	strategy,
	...subject
}: { tracks: SceneTracks } & PlacementSubject & {
		timeSpans: PlacementTimeSpan[];
		strategy: PlacementStrategy;
	}): PlacementResult | null {
	// The WASM function will return null/undefined (or throw) if not found, 
	// or return the typed PlacementResult.
	const result = wasmResolveTrackPlacement(
		tracks,
		subject,
		timeSpans,
		strategy,
	);
	return result ? (result as PlacementResult) : null;
}

export function applyPlacement({
	tracks,
	placementResult,
	elements,
	newTrackInsertIndexOverride,
}: {
	tracks: SceneTracks;
	placementResult: PlacementResult;
	elements: TimelineElement[];
	newTrackInsertIndexOverride?: number;
}): { updatedTracks: SceneTracks; targetTrackId: string } | null {
	const result = wasmApplyPlacement(
		tracks,
		placementResult,
		elements,
		newTrackInsertIndexOverride,
	);
	return result
		? (result as { updatedTracks: SceneTracks; targetTrackId: string })
		: null;
}

export function placeElementsOnTimeline({
	tracks,
	subject,
	timeSpans,
	strategy,
	elements,
	newTrackInsertIndexOverride,
}: {
	tracks: SceneTracks;
	subject: PlacementSubject;
	timeSpans: PlacementTimeSpan[];
	strategy: PlacementStrategy;
	elements: TimelineElement[];
	newTrackInsertIndexOverride?: number;
}): { updatedTracks: SceneTracks; targetTrackId: string } | null {
	const result = wasmPlaceElementsOnTimeline(
		tracks,
		subject,
		timeSpans,
		strategy,
		elements,
		newTrackInsertIndexOverride,
	);
	return result
		? (result as { updatedTracks: SceneTracks; targetTrackId: string })
		: null;
}
