"use server";

import { db } from "@/db";
import { users, projects, timelines, tracks, clips } from "@/db/schema";
import { eq } from "drizzle-orm";

// eslint-disable-next-line lazynext/prefer-object-params
export async function createProject(userId: string, name: string) {
	const projectId = `proj_${Date.now()}`;
	const timelineId = `tl_${Date.now()}`;
	const trackId = `track_${Date.now()}`;

	// Ensure user exists (for local development/testing)
	try {
		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		if (existingUser.length === 0) {
			await db.insert(users).values({
				id: userId,
				name: "Local User",
				email: "local@example.com",
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
	} catch (err) {
		console.error("Failed to ensure user exists:", err);
	}

	// 1. Create Project
	await db.insert(projects).values({
		id: projectId,
		name,
		userId,
	});

	// 2. Create Default Timeline (1080p, 30fps)
	await db.insert(timelines).values({
		id: timelineId,
		projectId,
		width: 1920,
		height: 1080,
		framerate: 30.0,
	});

	// 3. Create Default Track
	await db.insert(tracks).values({
		id: trackId,
		projectId,
		timelineId,
		name: "Video Track 1",
		type: "video",
		order: 0,
		zIndex: 0,
	});

	return { projectId };
}

export async function saveProject(projectId: string, projectData: any) {
	try {
		await db
			.update(projects)
			.set({
				data: projectData,
				updatedAt: new Date(),
			})
			.where(eq(projects.id, projectId));
		return { success: true };
	} catch (err) {
		console.error("Failed to save project state to DB:", err);
		return { success: false, error: "Failed to sync to database" };
	}
}

export async function getProject(projectId: string) {
	// Try to find the project
	const projectResult = await db
		.select()
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);

	if (projectResult.length === 0) {
		// Auto-create to sync with Local Storage UUIDs created by the UI
		try {
			const userId = "local_user"; // Mock ID for now since no auth

			// Ensure user exists (for local development/testing)
			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			if (existingUser.length === 0) {
				await db.insert(users).values({
					id: userId,
					name: "Local User",
					email: "local@example.com",
					emailVerified: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}

			await db
				.insert(projects)
				.values({ id: projectId, name: "Imported Project", userId });

			// Retry fetch
			const retryResult = await db
				.select()
				.from(projects)
				.where(eq(projects.id, projectId))
				.limit(1);
			if (retryResult.length > 0) {
				return getProject(projectId); // Recursively call getProject now that it exists
			}
		} catch (e) {
			console.error("Auto-create fallback failed:", e);
		}
		return null;
	}
	const project = projectResult[0];

	// Return full data if it exists, otherwise return a minimal struct
	if (project.data) {
		return {
			...project,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			...(project.data as object),
		} as any;
	}

	// Fallback minimal structure for newly auto-created projects without data yet
	return {
		...project,
		timeline: {
			width: 1920,
			height: 1080,
			framerate: 30.0,
			tracks: [],
		},
	} as any;
}

export async function getAllProjects() {
	const allProjects = await db
		.select()
		.from(projects)
		.orderBy(projects.updatedAt);
	return allProjects.map((p) => {
		if (p.data) {
			return {
				...p,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
				...(p.data as object),
			} as any;
		}
		return p as any;
	});
}
