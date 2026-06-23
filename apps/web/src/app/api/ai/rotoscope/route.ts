import { NextResponse } from "next/server";

const PRE_PROCESSING_URL =
	process.env.PRE_PROCESSING_URL || "http://localhost:8000";

export async function POST(request: Request) {
	try {
		const { clipId, objectPrompt } = (await request.json()) as {
			clipId?: string;
			objectPrompt?: string;
		};

		if (!clipId) {
			return NextResponse.json(
				{ success: false, error: "Clip ID is required" },
				{ status: 400 },
			);
		}

		console.log(`[API] Dispatching rotoscoping for clip: ${clipId}`);

		// Forward to pre-processing microservice
		try {
			const response = await fetch(`${PRE_PROCESSING_URL}/rotoscope`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					video_id: clipId,
					object_prompt: objectPrompt || "person",
				}),
			});

			if (response.ok) {
				const data = (await response.json()) as {
					mask_url?: string;
					success?: boolean;
				};
				return NextResponse.json({
					success: true,
					message: "Subject isolated from background",
					maskData: {
						type: "rotoscope",
						status: "completed",
						maskUrl: data.mask_url || `/api/assets/masks/${clipId}.png`,
					},
				});
			}
		} catch (err) {
			console.warn(`[Rotoscope] Pre-processing service unreachable: ${err}`);
		}

		// Dev-only fallback
		if (process.env.NODE_ENV !== "production") {
			return NextResponse.json({
				success: true,
				message: "Subject isolated (dev fallback)",
				maskData: {
					type: "rotoscope",
					status: "completed",
					maskUrl: `/api/assets/masks/generated_${clipId}.png`,
					source: "dev-fallback",
				},
			});
		}

		return NextResponse.json(
			{
				success: false,
				error: "Rotoscoping service unavailable",
			},
			{ status: 503 },
		);
	} catch (error: unknown) {
		console.error("Rotoscope API Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
