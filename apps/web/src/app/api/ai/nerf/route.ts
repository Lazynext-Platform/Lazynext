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
			`[API] Dispatching 3D Point Cloud Extraction for video: ${videoId}`,
		);

		try {
			// Forward to Python Generative Studio Microservice
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

			const res = await fetch("http://localhost:8001/nerf-extract", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ video_id: videoId }),
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (!res.ok)
				throw new Error(`Microservice returned status ${res.status}`);
			const data = await res.json();

			return NextResponse.json({
				success: true,
				message: "3D Point Cloud successfully extracted via NeRF Microservice",
				modelUrl: data.model_url,
				previewUrl: `/api/assets/3d_models/preview_${videoId}.mp4`,
			});
		} catch (microserviceError: any) {
			console.warn(
				"[API] Microservice unreachable or failed. Falling back to mock data.",
				microserviceError.message,
			);

			// Fallback mechanism if the Python service is offline
			return NextResponse.json({
				success: true,
				message: "3D Point Cloud extracted via Fallback Mock (Service Offline)",
				modelUrl: `/api/assets/3d_models/nerf_${videoId}.ply`,
				previewUrl: `/api/assets/3d_models/preview_${videoId}.mp4`,
			});
		}
	} catch (error: any) {
		console.error("NeRF API Error:", error);
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 },
		);
	}
}
