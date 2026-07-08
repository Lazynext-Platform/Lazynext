/** @module Storage type definitions for adapters, project records, and persistence interfaces */
import type { MediaType } from "@/media/types";
import type {
	TProject,
	TProjectMetadata,
	TTimelineViewState,
} from "@/project/types";
import type { TScene } from "@/timeline";

export interface StorageAdapter<T> {
	/** Retrieves a value by key. */
	get(key: string): Promise<T | null>;
	/** Stores a key-value pair. */
	set(args: { key: string; value: T }): Promise<void>;
	/** Removes a value by key. */
	remove(key: string): Promise<void>;
	/** Lists all stored keys. */
	list(): Promise<string[]>;
	/** Clears all stored data. */
	clear(): Promise<void>;
}

export interface MediaAssetData {
	/** Unique asset identifier. */
	id: string;
	/** Display name. */
	name: string;
	/** Media type category. */
	type: MediaType;
	/** File size in bytes. */
	size: number;
	/** Last modified timestamp. */
	lastModified: number;
	/** Media width in pixels. */
	width?: number;
	/** Media height in pixels. */
	height?: number;
	/** Duration in seconds. */
	duration?: number;
	/** Frames per second. */
	fps?: number;
	/** Whether the asset contains an audio track. */
	hasAudio?: boolean;
	/** Whether the asset is ephemeral. */
	ephemeral?: boolean;
	/** Thumbnail preview URL. */
	thumbnailUrl?: string;
}

export type SerializedScene = Omit<TScene, "createdAt" | "updatedAt"> & {
	/** ISO-8601 creation timestamp. */
	createdAt: string;
	/** ISO-8601 last-updated timestamp. */
	updatedAt: string;
};

export type SerializedProjectMetadata = Omit<
	TProjectMetadata,
	"createdAt" | "updatedAt"
> & {
	/** ISO-8601 creation timestamp. */
	createdAt: string;
	/** ISO-8601 last-updated timestamp. */
	updatedAt: string;
};

export type SerializedProject = Omit<TProject, "metadata" | "scenes"> & {
	/** Serialized project metadata. */
	metadata: SerializedProjectMetadata;
	/** Serialized project scenes. */
	scenes: SerializedScene[];
	/** Optional serialized timeline view state. */
	timelineViewState?: TTimelineViewState;
};

export interface StorageConfig {
	/** IndexedDB database name for projects. */
	projectsDb: string;
	/** IndexedDB database name for media. */
	mediaDb: string;
	/** IndexedDB database name for saved sounds. */
	savedSoundsDb: string;
	/** Schema version number. */
	version: number;
}

// TypeScript type augmentation to add async iterator methods to FileSystemDirectoryHandle
// These methods are part of the File System Access API spec but may not be in all type definitions
declare global {
	interface FileSystemDirectoryHandle {
		keys(): AsyncIterableIterator<string>;
		values(): AsyncIterableIterator<FileSystemHandle>;
		entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
	}
}
