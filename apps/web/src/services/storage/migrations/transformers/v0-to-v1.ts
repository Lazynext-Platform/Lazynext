/** @module Project data transformer v0 to v1 */
import { generateUUID } from "@/utils/id";
import type { MigrationResult, ProjectRecord } from "./types";
import { isRecord } from "./utils";

interface V1Scene {
	/** Unique scene identifier. */
	id: string;
	/** Scene display name. */
	name: string;
	/** Whether this is the main scene. */
	isMain: boolean;
	/** Tracks contained in the scene. */
	tracks: unknown[];
	/** Bookmarks in the scene. */
	bookmarks: unknown[];
	/** ISO creation timestamp. */
	createdAt: string;
	/** ISO last-updated timestamp. */
	updatedAt: string;
}

/** Type definition for TransformV0ToV1Options. */
export interface TransformV0ToV1Options {
	/** Timestamp to use for created/updated fields. */
	now?: Date;
}

/** Utility representing transformProjectV0ToV1. */
export function transformProjectV0ToV1({
	project,
	options = {},
}: {
	project: ProjectRecord;
	options?: TransformV0ToV1Options;
}): MigrationResult<ProjectRecord> {
	const { now = new Date() } = options;

	const scenesValue = project.scenes;
	if (Array.isArray(scenesValue) && scenesValue.length > 0) {
		return { project, skipped: true, reason: "already has scenes" };
	}

	const sceneId = generateUUID();
	const sceneCreatedAt = now.toISOString();
	const sceneUpdatedAt = now.toISOString();

	const mainScene: V1Scene = {
		id: sceneId,
		name: "Main scene",
		isMain: true,
		tracks: [],
		bookmarks: [],
		createdAt: sceneCreatedAt,
		updatedAt: sceneUpdatedAt,
	};

	const updatedProject: ProjectRecord = {
		...project,
		scenes: [mainScene],
		currentSceneId: sceneId,
		version: 1,
	};

	const updatedAt = now.toISOString();
	if (isRecord(project.metadata)) {
		updatedProject.metadata = {
			...project.metadata,
			updatedAt,
		};
	} else {
		updatedProject.updatedAt = updatedAt;
	}

	return { project: updatedProject, skipped: false };
}

export { getProjectId } from "./utils";
