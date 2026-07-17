/** @module Storage migration v21 to v22 */
import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV21ToV22 } from "./transformers/v21-to-v22";

/** Class representing V21toV22Migration. */
export class V21toV22Migration extends StorageMigration {
	from = 21;
	to = 22;

	async run({
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
		return transformProjectV21ToV22({ project });
	}
}
