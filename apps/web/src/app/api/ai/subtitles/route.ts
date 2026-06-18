import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const { videoId } = await request.json();

		if (!videoId) {
			return NextResponse.json(
				{ success: false, error: "Video ID is required" },
				{ status: 400 },
			);
		}

		console.log(
			`[API] Dispatching transcription task to Pre-Processing Service for video: ${videoId}`,
		);

		try {
			// Forward to Python Pre-Processing Microservice
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

			const res = await fetch("http://localhost:8000/transcribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ video_id: videoId }),
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (!res.ok)
				throw new Error(`Microservice returned status ${res.status}`);
			const data = await res.json();

			// Parse Microservice Output into Timeline Format
			const mappedSubtitles = data.subtitles.map((sub: { text: string; start: number; end: number }, i: number) => ({
				id: `clip-${Date.now()}-${i}`,
				name: sub.text.substring(0, 15) + "...",
				type: "text",
				start_frame: Math.floor(sub.start * 60), // Assuming 60fps
				duration_frames: Math.floor((sub.end - sub.start) * 60),
				text: sub.text,
			}));

			return NextResponse.json({
				success: true,
				message:
					"Transcription successfully generated via Pre-Processing Microservice",
				subtitles: mappedSubtitles,
			});
		} catch (microserviceError: unknown) {
			console.warn(
				"[API] Microservice unreachable or failed. Falling back to mock data.",
				(microserviceError instanceof Error ? microserviceError.message : String(microserviceError)),
			);

			// Fallback mechanism if the Python service is offline
			const mockSubtitles = [
				{
					id: `clip-${Date.now()}-1`,
					name: "Welcome to",
					type: "text",
					start_frame: 0,
					duration_frames: 30,
					text: "Welcome to",
				},
				{
					id: `clip-${Date.now()}-2`,
					name: "Lazynext",
					type: "text",
					start_frame: 30,
					duration_frames: 45,
					text: "Lazynext",
				},
				{
					id: `clip-${Date.now()}-3`,
					name: "Platform",
					type: "text",
					start_frame: 75,
					duration_frames: 40,
					text: "Platform",
				},
				{
					id: `clip-${Date.now()}-4`,
					name: "We are live!",
					type: "text",
					start_frame: 115,
					duration_frames: 60,
					text: "We are live!",
				},
			];

			return NextResponse.json({
				success: true,
				message: "Transcription generated via Fallback Mock (Service Offline)",
				subtitles: mockSubtitles,
			});
		}
	} catch (error: unknown) {
		console.error("Transcription API Error:", error);
		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}
