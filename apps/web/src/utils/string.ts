/**
 * @module utils/string
 * @description String transformation utilities.
 */

/** Capitalises the first character of a string. */
export function capitalizeFirstLetter({ string }: { string: string }) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/** Converts the entire string to uppercase. */
export function uppercase({ string }: { string: string }) {
	return string.toUpperCase();
}
