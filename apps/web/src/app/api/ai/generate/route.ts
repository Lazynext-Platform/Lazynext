import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { prompt, mediaContext, type } = body;

		if (!prompt) {
			return NextResponse.json(
				{ error: "Missing text prompt" },
				{ status: 400 },
			);
		}

		// Authenticate and check AI credits
		const session = await auth.api.getSession({ headers: await headers() });
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const dbUser = await db.query.user.findFirst({
			where: eq(user.id, session.user.id),
		});

		if (!dbUser || dbUser.aiCredits < 10) {
			return NextResponse.json(
				{ error: "Insufficient AI Credits. Please upgrade your plan." },
				{ status: 402 },
			);
		}

		// Deduct 10 credits for a video generation
		await db
			.update(user)
			.set({ aiCredits: sql`${user.aiCredits} - 10` })
			.where(eq(user.id, session.user.id));

		// Forward the prompt to the local Python generative studio service
		const endpoint = type === "audio" ? "generate-audio" : "generate-video";
		const response = await fetch(`http://localhost:8001/${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				prompt,
				context: mediaContext || [],
			}),
		});

		if (!response.ok) {
			throw new Error(`Python service failed with status ${response.status}`);
		}

		const data = await response.json();

		// Normalize the response so the frontend always gets { url, name, type }
		// Generative studio returns asset_url.
		const assetUrl = data.asset_url || data.url;

		return NextResponse.json({
			url: assetUrl,
			name: `Generated ${type === "audio" ? "Audio" : "Video"}`,
			type: type === "audio" ? "audio" : "video",
		});
	} catch (error: unknown) {
		console.error("[Generative API Error]:", error);
		return NextResponse.json(
			{ error: "Failed to generate AI response" },
			{ status: 500 },
		);
	}
}
