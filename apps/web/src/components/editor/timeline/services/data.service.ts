/** @module Data service for serializing and deserializing project editors to/from JSON */
import Watermark from "../core/addOns/watermark";
import { TrackElement } from "../core/elements/base.element";
import { Track } from "../core/track/track";
import { ProjectMetadata } from "../types";

type TimelineStore = {
	/** Tracks in the timeline. */
	tracks: Track[];
	/** Store version number. */
	version: number;
	/** Optional background color. */
	backgroundColor?: string;
	/** Optional project metadata. */
	metadata?: ProjectMetadata;
	/** Map of element id to element. */
	elementMap: Record<string, TrackElement>;
	/** Map of track id to track data. */
	trackMap: Record<string, any>;
	/** Map of caption properties. */
	captionProps: Record<string, any>;
};

/** Type definition for TimelineTrackData. */
export type TimelineTrackData = {
	/** Tracks in the timeline. */
	tracks: Track[];
	/** Data version number. */
	version: number;
	/** Optional background color. */
	backgroundColor?: string;
	/** Optional watermark. */
	watermark?: Watermark;
	/** Optional project metadata. */
	metadata?: ProjectMetadata;
};

/** Class representing TimelineContextStore. */
export class TimelineContextStore {
	private static instance: TimelineContextStore;
	private storeMap: Map<string, TimelineStore>;

	private constructor() {
		this.storeMap = new Map();
	}

	public static getInstance(): TimelineContextStore {
		if (!TimelineContextStore.instance) {
			TimelineContextStore.instance = new TimelineContextStore();
		}
		return TimelineContextStore.instance;
	}

	public initializeContext(contextId: string): void {
		if (!this.storeMap.has(contextId)) {
			this.storeMap.set(contextId, {
				tracks: [],
				version: 0,
				elementMap: {},
				trackMap: {},
				captionProps: {},
			});
		}
	}

	public getTimelineData(contextId: string): TimelineTrackData | null {
		const timelineStore = this.storeMap.get(contextId);
		return timelineStore
			? {
					tracks: timelineStore.tracks,
					version: timelineStore.version,
					backgroundColor: timelineStore.backgroundColor,
					metadata: timelineStore.metadata,
				}
			: null;
	}

	public setTimelineData(
		contextId: string,
		timelineData: TimelineTrackData,
	): TimelineTrackData {
		this.ensureContext(contextId);
		const store = this.storeMap.get(contextId)!;
		store.tracks = timelineData.tracks;
		store.version = timelineData.version;
		if (timelineData.backgroundColor !== undefined) {
			store.backgroundColor = timelineData.backgroundColor;
		}
		if (timelineData.metadata !== undefined) {
			store.metadata = timelineData.metadata;
		}
		return timelineData;
	}

	public getElementMap(contextId: string): Record<string, TrackElement> {
		this.ensureContext(contextId);
		return this.storeMap.get(contextId)!.elementMap;
	}

	public setElementMap(
		contextId: string,
		elementMap: Record<string, TrackElement>,
	): void {
		this.ensureContext(contextId);
		this.storeMap.get(contextId)!.elementMap = elementMap;
	}

	public getTrackMap(contextId: string): Record<string, any> {
		this.ensureContext(contextId);
		return this.storeMap.get(contextId)!.trackMap;
	}

	public setTrackMap(contextId: string, trackMap: Record<string, any>): void {
		this.ensureContext(contextId);
		this.storeMap.get(contextId)!.trackMap = trackMap;
	}

	public getCaptionProps(contextId: string): Record<string, any> {
		this.ensureContext(contextId);
		return this.storeMap.get(contextId)!.captionProps;
	}

	public setCaptionProps(
		contextId: string,
		captionProps: Record<string, any>,
	): void {
		this.ensureContext(contextId);
		this.storeMap.get(contextId)!.captionProps = captionProps;
	}

	public clearContext(contextId: string): void {
		this.storeMap.delete(contextId);
	}

	private ensureContext(contextId: string): void {
		if (!this.storeMap.has(contextId)) {
			this.initializeContext(contextId);
		}
	}
}

/** Utility representing timelineContextStore. */
export const timelineContextStore = TimelineContextStore.getInstance();
