/** @module Media utility types for dimensions, position, and video metadata */
export type Dimensions = { width: number; height: number };

export type Position = { x: number; y: number };

export type VideoMeta = Dimensions & { duration: number };
