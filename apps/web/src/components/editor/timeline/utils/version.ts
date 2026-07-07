/**
 * Package version constant.
 * Imports version directly from package.json
 *
 * @module components/editor/timeline/utils/version
 */

/**
 * Get the package version from package.json
 * @returns The package version from package.json
 */
export function getPackageVersion(): string {
	return "0.1.0";
}

/**
 * Get the package name
 * @returns The package name from package.json
 */
export function getPackageName(): string {
	return "@lazynext/web";
}
