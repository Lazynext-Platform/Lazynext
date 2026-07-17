/** @module Storage migration v17 to v18 */
import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV17ToV18 } from "./transformers/v17-to-v18";

/** Class representing V17toV18Migration. */
export class V17toV18Migration extends StorageMigration {
	from = 17;
	to = 18;

	async run({
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
		return transformProjectV17ToV18({ project });
	}
}
