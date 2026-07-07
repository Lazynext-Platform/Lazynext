/** @module media/types Media asset type definitions for the Lazynext web editor.
 *
 * Defines the shape of media assets as they appear in the frontend, extending the
 * backend {@link MediaAssetData} type with browser-native `File` handles for local
 * upload workflows.
 */

import type { MediaAssetData } from "@/services/storage/types";

/** Supported media categories that can exist on a timeline track. */
export type MediaType = "image" | "video" | "audio";

/**
 * Frontend representation of a media asset.
 *
 * Extends the storage-layer {@link MediaAssetData} (omitting `size` and
 * `lastModified` which are derived from the native `File` object) and adds
 * the browser `File` handle plus an optional resolved URL.
 */
export interface MediaAsset extends Omit<
	MediaAssetData,
	"size" | "lastModified"
> {
	file: File;
	url?: string;
}
