/** @module Transform primitive — scale, position, and rotation */
export interface Transform {
	/** Horizontal scale factor. */
	scaleX: number;
	/** Vertical scale factor. */
	scaleY: number;
	/** Position offset. */
	position: {
		/** Horizontal position. */
		x: number;
		/** Vertical position. */
		y: number;
	};
	/** Rotation in degrees. */
	rotate: number;
}
