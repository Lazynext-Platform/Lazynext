/**
 * Maps the flat WASM EntityGraph back to nested React TScene[] trees.
 *
 * The WASM EntityGraph is a flat key-value store with entity definitions
 * and parent-child links. This module hydrates that flat structure into
 * the nested scene → track → element hierarchy that the React UI expects.
 *
 * @module collaboration/crdt-mapper
 */

import type { TScene, TimelineTrack, TimelineElement, SceneTracks, Bookmark } from "@/timeline";

/**
 * Maps the flat WASM EntityGraph back into the nested React TScene[] tree.
 * 
 * The WASM EntityGraph is a flat key-value store:
 * {
 *   entities: { "scene_1": "{id: 'scene_1', name: 'Main'}", "track_1": "..." },
 *   links: { "scene_1": ["track_1", "track_2"] }
 * }
 */
/**
 * Converts a flat WASM EntityGraph into a sorted array of TScene objects.
 *
 * Each entity is parsed from JSON, then scenes are identified, their
 * tracks/elements/bookmarks are hydrated from link maps, and the result
 * is sorted with the main scene first.
 *
 * @param entityGraph - the raw entity graph from the WASM CRDT engine.
 * @returns a sorted array of hydrated TScene objects.
 */
export function hydrateScenesFromEntityGraph(entityGraph: any): TScene[] {
	if (!entityGraph || !entityGraph.entities) {
		return [];
	}

	const entities = entityGraph.entities;
	const links = entityGraph.links || {};

	// Parse all entities
	const parsedEntities = new Map<string, any>();
	for (const [id, jsonStr] of Object.entries(entities)) {
		try {
			parsedEntities.set(id, JSON.parse(jsonStr as string));
		} catch (e) {
			console.warn(`Failed to parse entity ${id}`);
		}
	}

	// Find all scenes (entities with type="scene")
	const scenes: TScene[] = [];
	
	for (const [id, entity] of parsedEntities.entries()) {
		if (entity.type === "scene" || (entity.tracks === undefined && entity.isMain !== undefined)) {
			const hydratedTracks = hydrateSceneTracks(id, parsedEntities, links);
			const hydratedBookmarks = hydrateBookmarks(id, parsedEntities, links);
			const scene: TScene = {
				...entity,
				tracks: hydratedTracks.main ? hydratedTracks : (entity.tracks || hydratedTracks),
				bookmarks: hydratedBookmarks.length > 0 ? hydratedBookmarks : (entity.bookmarks || []),
			};
			scenes.push(scene);
		}
	}

	// Sort scenes: main scene first, then by createdAt
	return scenes.sort((a, b) => {
		if (a.isMain) return -1;
		if (b.isMain) return 1;
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	});
}

function hydrateSceneTracks(sceneId: string, parsedEntities: Map<string, any>, links: Record<string, string[]>): SceneTracks {
	const tracks: SceneTracks = {
		overlay: [],
		main: null as any,
		audio: [],
	};

	const linkedIds = links[sceneId] || [];
	for (const trackId of linkedIds) {
		const track = parsedEntities.get(trackId);
		if (!track) continue;

		// Hydrate elements for this track
		const elements = hydrateElements(trackId, parsedEntities, links);
		const populatedTrack = { ...track, elements };

		if (track.type === "video" && track.isMain) {
			tracks.main = populatedTrack;
		} else if (track.type === "audio") {
			tracks.audio.push(populatedTrack);
		} else {
			tracks.overlay.push(populatedTrack);
		}
	}

	return tracks;
}

function hydrateElements(trackId: string, parsedEntities: Map<string, any>, links: Record<string, string[]>): TimelineElement[] {
	const elements: TimelineElement[] = [];
	const linkedIds = links[trackId] || [];
	
	for (const elementId of linkedIds) {
		const element = parsedEntities.get(elementId);
		if (!element) continue;

		// We could hydrate sub-entities like keyframes, masks, effects here if they were separate entities.
		// If they are embedded in the element JSON, they are already parsed.
		elements.push(element);
	}

	return elements.sort((a, b) => a.startTime - b.startTime);
}

function hydrateBookmarks(sceneId: string, parsedEntities: Map<string, any>, links: Record<string, string[]>): Bookmark[] {
	const bookmarks: Bookmark[] = [];
	const linkedIds = links[sceneId] || [];
	for (const id of linkedIds) {
		const entity = parsedEntities.get(id);
		if (entity && entity.type === "bookmark") {
			bookmarks.push(entity);
		}
	}
	return bookmarks.sort((a, b) => a.time - b.time);
}
