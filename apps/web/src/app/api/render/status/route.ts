import { NextResponse } from "next/server";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const jobId = searchParams.get("jobId");

		if (!jobId) {
			return NextResponse.json(
				{ success: false, error: "Job ID is required" },
				{ status: 400 },
			);
		}

		// In a production environment, this polls the database or the render-service directly
		// For this simulation, we'll pretend it progresses over time and eventually completes.
		const progress = Math.min(100, Math.floor(Math.random() * 40) + 60); // Random progress between 60% and 100%
		const isComplete = progress === 100;

		return NextResponse.json({
			success: true,
			jobId: jobId,
			status: isComplete ? "completed" : "rendering",
			progress: progress,
			downloadUrl: isComplete ? `/api/assets/exports/${jobId}.mp4` : null,
		});
	} catch (error: any) {
		console.error("Render Status API Error:", error);
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 },
		);
	}
}
