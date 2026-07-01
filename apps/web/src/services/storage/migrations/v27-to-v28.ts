/**
 * Storage migration v27 → v28 — transforms project records from
 * schema version 27 to version 28.
 *
 * @module services/storage/migrations/v27-to-v28
 */

import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV27ToV28 } from "./transformers/v27-to-v28";

export class V27toV28Migration extends StorageMigration {
	from = 27;
	to = 28;

	async run({
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
		return transformProjectV27ToV28({ project });
	}
}
