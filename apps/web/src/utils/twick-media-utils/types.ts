/** @module Media utility types for dimensions, position, and video metadata */
export type Dimensions = { width: number; height: number };

/** Type definition for Position. */
export type Position = { x: number; y: number };

/** Type definition for VideoMeta. */
export type VideoMeta = Dimensions & { duration: number };
