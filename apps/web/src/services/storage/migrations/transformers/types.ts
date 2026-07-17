/**
 * Type definitions for different project versions used in migrations.
 * These types are intentionally loose (using Record) because we're dealing
 * with potentially malformed data from older versions.
 */

export type ProjectRecord = Record<string, unknown>;

/** Type definition for MigrationResult. */
export interface MigrationResult<T> {
	/** The migrated project. */
	project: T;
	/** Whether the migration was skipped. */
	skipped: boolean;
	/** Reason if migration was skipped. */
	reason?: string;
}
