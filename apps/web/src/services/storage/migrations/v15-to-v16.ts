/**
 * @module services/storage/migrations/v15-to-v16
 */

import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV15ToV16 } from "./transformers/v15-to-v16";

/** Class representing V15toV16Migration. */
export class V15toV16Migration extends StorageMigration {
	from = 15;
	to = 16;

	async run({
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
		return transformProjectV15ToV16({ project });
	}
}
