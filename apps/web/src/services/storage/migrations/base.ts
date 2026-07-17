/** @module Base migration class and interfaces for storage schema migrations */
import type { MigrationResult, ProjectRecord } from "./transformers/types";

/** Type definition for StorageMigrationRunArgs. */
export interface StorageMigrationRunArgs {
	/** Identifier of the project being migrated. */
	projectId: string;
	/** The project record to migrate. */
	project: ProjectRecord;
}

export abstract class StorageMigration {
	abstract from: number;
	abstract to: number;

	abstract run({
		projectId,
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>>;
}
