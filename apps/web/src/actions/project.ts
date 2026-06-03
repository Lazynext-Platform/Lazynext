"use server";

import { db } from "@/db";
import { users, projects, timelines, tracks, clips } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createProject(userId: string, name: string) {
  const projectId = `proj_${Date.now()}`;
  const timelineId = `tl_${Date.now()}`;
  const trackId = `track_${Date.now()}`;

  // Ensure user exists (for local development/testing)
  try {
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: userId,
        name: "Local User",
        email: "local@example.com",
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
    timelineId,
    name: "Video Track 1",
    zIndex: 0,
  });

  return { projectId };
}

export async function getProject(projectId: string) {
  // 1. Get Project
  const projectResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (projectResult.length === 0) {
    // Auto-create to sync with Local Storage UUIDs created by the UI
    try {
      const userId = "local_user";
      // Ensure user exists
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existingUser.length === 0) {
        await db.insert(users).values({ id: userId, name: "Local User", email: "local@example.com" });
      }

      const timelineId = `tl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await db.insert(projects).values({ id: projectId, name: "Imported Project", userId });
      await db.insert(timelines).values({ id: timelineId, projectId, width: 1920, height: 1080, framerate: 60.0 });
      await db.insert(tracks).values({ id: trackId, timelineId, name: "Video Track 1", zIndex: 0 });
      
      // Retry fetch
      const retryResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (retryResult.length > 0) {
        return getProject(projectId); // Recursively call getProject now that it exists
      }
    } catch (e) {
      console.error("Auto-create fallback failed:", e);
    }
    return null;
  }
  const project = projectResult[0];

  // 2. Get Timeline
  const timelineResult = await db.select().from(timelines).where(eq(timelines.projectId, projectId)).limit(1);
  const timeline = timelineResult[0];

  // 3. Get Tracks
  const projectTracks = await db.select().from(tracks).where(eq(tracks.timelineId, timeline.id)).orderBy(tracks.zIndex);

  // 4. Get Clips
  const trackIds = projectTracks.map((t) => t.id);
  
  let projectClips: typeof clips.$inferSelect[] = [];
  // For simplicity without 'inArray', we can fetch all clips and filter, or just loop if small
  for (const tid of trackIds) {
    const trackClips = await db.select().from(clips).where(eq(clips.trackId, tid));
    projectClips = [...projectClips, ...trackClips];
  }

  return {
    ...project,
    timeline: {
      ...timeline,
      tracks: projectTracks.map((track) => ({
        ...track,
        clips: projectClips.filter((c) => c.trackId === track.id),
      })),
    },
  };
}
