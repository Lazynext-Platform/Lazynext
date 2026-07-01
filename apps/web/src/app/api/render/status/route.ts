/**
 * @module Render job status polling — checks the render-service first, then
 * falls back to an in-memory "offline" state when the service is unreachable.
 */

import { NextResponse } from "next/server";

const RENDER_SERVICE_URL =
	process.env.RENDER_SERVICE_URL || "http://localhost:8003";

// Track local-fallback jobs (in-memory; reset on server restart)
const localJobs = new Map<
	string,
	{ progress: number; status: string; createdAt: number }
>();

/**
 * GET /api/render/status?jobId=...
 * Polls the current status and progress of a render job. Proxies the render
 * service when available; returns offline status for locally-tracked jobs.
 */
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

		// Local fallback: job was created without render-service running.
		// Return "offline" status — no simulated progress.
		let localJob = localJobs.get(jobId);
		if (!localJob) {
			localJob = {
				progress: 0,
				status: "offline",
				createdAt: Date.now(),
			};
			localJobs.set(jobId, localJob);
		}

		return NextResponse.json({
			success: true,
			jobId,
			progress: 0,
			status: "offline",
			message: "Render service is offline. Start render-service on port 8003 to process exports.",
		});
	} catch (error: unknown) {
		console.error("Render Status API Error:", error);
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
