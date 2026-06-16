import { NextRequest, NextResponse } from "next/server";

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
		return NextResponse.json({
			url: data.url,
			name: `Generated ${type === "audio" ? "Audio" : "Video"}`,
			type: type === "audio" ? "audio" : "video",
		});
	} catch (error: any) {
		console.error("[Generative API Error]:", error);
		return NextResponse.json(
			{ error: "Failed to generate AI response" },
			{ status: 500 },
		);
	}
}
