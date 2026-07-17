/** @module Storage migration v5 to v6 for project data schema updates */
import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV5ToV6 } from "./transformers/v5-to-v6";

/** Class representing V5toV6Migration. */
export class V5toV6Migration extends StorageMigration {
	from = 5;
	to = 6;

	async run({
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
		return transformProjectV5ToV6({ project });
	}
}
