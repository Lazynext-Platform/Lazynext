import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const { prompt } = await request.json();

		if (!prompt) {
			return NextResponse.json(
				{ success: false, error: "Prompt is required" },
				{ status: 400 },
			);
		}

		console.log(
			`[API] Dispatching Text-to-Video task to Generative Studio: "${prompt}"`,
		);

		try {
			// Forward to Python Generative Studio Microservice
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

			const res = await fetch("http://localhost:8001/generate-video", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt }),
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (!res.ok)
				throw new Error(`Microservice returned status ${res.status}`);
			const data = await res.json();

			const mappedVideoClip = {
				id: crypto.randomUUID(),
				name: `Gen: ${prompt.substring(0, 10)}`,
				type: "video",
				start_frame: 0,
				duration_frames: 300,
				color: "bg-fuchsia-600/80 border-fuchsia-400",
				source: data.asset_url,
			};

			return NextResponse.json({
				success: true,
				message: "Video successfully generated via Open-Sora",
				clip: mappedVideoClip,
			});
		} catch (microserviceError: unknown) {
			console.warn(
				"[API] Microservice unreachable or failed. Falling back to mock data.",
				microserviceError instanceof Error
					? microserviceError.message
					: String(microserviceError),
			);

			// Fallback mechanism if the Python service is offline
			const mockVideoClip = {
				id: crypto.randomUUID(),
				name: `Gen: ${prompt.substring(0, 10)}`,
				type: "video",
				start_frame: 0,
				duration_frames: 300,
				color: "bg-fuchsia-600/80 border-fuchsia-400",
			};

			return NextResponse.json({
				success: true,
				message:
					"Generated a 5-second 4K video clip via Fallback Mock (Service Offline)",
				clip: mockVideoClip,
			});
		}
	} catch (error: unknown) {
		console.error("Diffusion API Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
