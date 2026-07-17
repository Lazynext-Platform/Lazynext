/** @module Storage migration v12 to v13 */
import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV12ToV13 } from "./transformers/v12-to-v13";

/** Class representing V12toV13Migration. */
export class V12toV13Migration extends StorageMigration {
	from = 12;
	to = 13;

	async run({
		project,
	}: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
		return transformProjectV12ToV13({ project });
	}
}
