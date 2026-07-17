/** @module In-memory caches for image dimensions, video metadata, and audio duration */
import { Dimensions, VideoMeta } from "./types";

/** Utility representing imageDimensionsCache. */
export const imageDimensionsCache: Record<string, Dimensions> = {};
/** Utility representing videoMetaCache. */
export const videoMetaCache: Record<string, VideoMeta> = {};
/** Utility representing audioDurationCache. */
export const audioDurationCache: Record<string, number> = {};
