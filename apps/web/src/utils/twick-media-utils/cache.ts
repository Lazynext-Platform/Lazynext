/** @module In-memory caches for image dimensions, video metadata, and audio duration */
import { Dimensions, VideoMeta } from "./types";

export const imageDimensionsCache: Record<string, Dimensions> = {};
export const videoMetaCache: Record<string, VideoMeta> = {};
export const audioDurationCache: Record<string, number> = {};
