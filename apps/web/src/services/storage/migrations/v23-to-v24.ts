/**
 * @module services/storage/migrations/v23-to-v24
 */

import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV23ToV24 } from "./transformers/v23-to-v24";

/** Class representing V23toV24Migration. */
export class V23toV24Migration extends StorageMigration {
	from = 23;
	to = 24;

	async run({
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
		return transformProjectV23ToV24({ project });
	}
}
