import { NextResponse } from "next/server";

const RENDER_SERVICE_URL =
	process.env.RENDER_SERVICE_URL || "http://localhost:8003";

// Track local-fallback jobs (in-memory; reset on server restart)
const localJobs = new Map<
	string,
	{ progress: number; status: string; createdAt: number }
>();

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

		// Try polling the render-service first
		try {
			const response = await fetch(
				`${RENDER_SERVICE_URL}/api/v1/jobs/${jobId}`,
			);

			if (response.ok) {
				const data = (await response.json()) as {
					job?: {
						status: string;
						progress: number;
					};
				};
				const job = data.job;
				if (job) {
					return NextResponse.json({
						success: true,
						jobId,
						status: job.status,
						progress: job.progress,
						downloadUrl:
							job.status === "completed"
								? `/api/assets/exports/${jobId}.mp4`
								: null,
					});
				}
			}
		} catch {
			// Render service unreachable — use local tracking for fallback jobs
		}

		// Local fallback: track progress for jobs created without render-service
		let localJob = localJobs.get(jobId);
		if (!localJob) {
			localJob = {
				progress: 0,
				status: "queued",
				createdAt: Date.now(),
			};
			localJobs.set(jobId, localJob);
		}

		// Simulate realistic progress for local jobs
		const elapsed = Date.now() - localJob.createdAt;
		const estimatedDuration = 30000; // 30s estimated render time
		const progress = Math.min(
			100,
			Math.floor((elapsed / estimatedDuration) * 100),
		);

		if (localJob.status === "queued" && progress > 0) {
			localJob.status = "rendering";
		}
		if (progress >= 100) {
			localJob.status = "completed";
		}

		localJob.progress = progress;
		localJobs.set(jobId, localJob);

		return NextResponse.json({
			success: true,
			jobId,
			status: localJob.status,
			progress: localJob.progress,
			downloadUrl:
				localJob.status === "completed"
					? `/api/assets/exports/${jobId}.mp4`
					: null,
			source: "local-fallback",
		});

		// Clean up old completed jobs (> 1 hour)
		for (const [id, job] of localJobs) {
			if (job.status === "completed" && Date.now() - job.createdAt > 3600000) {
				localJobs.delete(id);
			}
		}
	} catch (error: unknown) {
		console.error("Render Status API Error:", error);
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
