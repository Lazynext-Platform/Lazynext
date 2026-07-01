/** @module Transform primitive — scale, position, and rotation */
export interface Transform {
	scaleX: number;
	scaleY: number;
	position: {
		x: number;
		y: number;
	};
	rotate: number;
}
