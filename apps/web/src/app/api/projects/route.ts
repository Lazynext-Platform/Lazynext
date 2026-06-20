import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, timelines, tracks } from "@/db/schema";
import { auth } from "@/auth/server";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const userProjects = await db
			.select()
			.from(projects)
			.where(eq(projects.userId, session.user.id))
			.orderBy(desc(projects.updatedAt));

		return NextResponse.json({ projects: userProjects });
	} catch (error) {
		console.error("GET /api/projects error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { name } = await req.json();

		if (!name || typeof name !== "string") {
			return NextResponse.json(
				{ error: "Project name is required" },
				{ status: 400 },
			);
		}

		// Generate deterministic IDs for initial setup
		const projectId = `prj_${crypto.randomUUID().replace(/-/g, "")}`;
		const timelineId = `tl_${crypto.randomUUID().replace(/-/g, "")}`;
		const trackVideoId = `trk_${crypto.randomUUID().replace(/-/g, "")}`;
		const trackAudioId = `trk_${crypto.randomUUID().replace(/-/g, "")}`;

		// Create the project
		await db.insert(projects).values({
			id: projectId,
			name,
			userId: session.user.id,
			data: {},
		});

		// Create the default timeline for this project
		await db.insert(timelines).values({
			id: timelineId,
			projectId,
			width: 1920,
			height: 1080,
			framerate: 30.0,
		});

		// Create default tracks (Video and Audio)
		await db.insert(tracks).values([
			{
				id: trackVideoId,
				projectId,
				timelineId,
				name: "Video 1",
				type: "video",
				zIndex: 1,
			},
			{
				id: trackAudioId,
				projectId,
				timelineId,
				name: "Audio 1",
				type: "audio",
				zIndex: 0,
			},
		]);

		return NextResponse.json({ success: true, projectId });
	} catch (error) {
		console.error("POST /api/projects error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
