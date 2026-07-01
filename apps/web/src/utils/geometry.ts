/**
 * @module utils/geometry
 * @description Geometry-related utility functions.
 */

/**
 * Computes the reduced aspect ratio string (e.g. `"16:9"`) from a
 * width and height using the greatest common divisor.
 */
export function dimensionToAspectRatio({
	width,
	height,
}: {
	width: number;
	height: number;
}): string {
	const gcd = ({ a, b }: { a: number; b: number }): number =>
		b === 0 ? a : gcd({ a: b, b: a % b });
	const divisor = gcd({ a: width, b: height });
	const aspectWidth = width / divisor;
	const aspectHeight = height / divisor;
	return `${aspectWidth}:${aspectHeight}`;
}
