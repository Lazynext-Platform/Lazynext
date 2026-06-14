"use server";

import { db } from "@/db";
import { projects, tracks, clips, agents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getProjectData(projectId: string) {
	const projectResult = await db
		.select()
		.from(projects)
		.where(eq(projects.id, projectId));

	if (projectResult.length === 0) {
		return null;
	}

	const project = projectResult[0];

	const trackResults = await db
		.select()
		.from(tracks)
		.where(eq(tracks.projectId, projectId));

	const tracksWithClips = await Promise.all(
		trackResults.map(async (track) => {
			const clipResults = await db
				.select()
				.from(clips)
				.where(eq(clips.trackId, track.id));
			return {
				...track,
				clips: clipResults,
			};
		}),
	);

	return {
		...project,
		tracks: tracksWithClips,
	};
}

export async function createProject(name: string) {
	const newId = `proj_${Date.now()}`;
	await db.insert(projects).values({
		id: newId,
		name,
		fps: 60,
		width: 1920,
		height: 1080,
		durationFrames: 1000,
	});
	return newId;
}

export async function syncProjectState(projectId: string, stateUpdate: any) {
	// In a real app, this would process the CRDT deltas from the Rust WASM module
	// and persist the timeline changes to Postgres
	console.log(`Syncing state for project ${projectId}`, stateUpdate);
	return { success: true };
}
