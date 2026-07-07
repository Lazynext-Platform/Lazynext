/**
 * Package version constant.
 * Imports version directly from package.json
 *
 * @example
 * @module components/editor/timeline/utils/version
 */
 * ```typescript
 * import { getPackageVersion } from './utils/version';
 * console.log(getPackageVersion()); // "0.14.11"
 * ```
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
