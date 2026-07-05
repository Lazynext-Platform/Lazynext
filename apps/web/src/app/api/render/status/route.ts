/**
 * @module Render job status polling — checks the render-service first, then
 * falls back to an in-memory "offline" state when the service is unreachable.
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RENDER_SERVICE_URL =
	process.env.RENDER_SERVICE_URL || "http://localhost:8003";

const localJobs = new Map<
	string,
	{ progress: number; status: string; createdAt: number }
>();

export async function GET(request: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const jobId = searchParams.get("jobId");

		if (!jobId) {
			return NextResponse.json(
				{ success: false, error: "Job ID is required" },
				{ status: 400 },
			);
		}

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
			// Render service unreachable
		}

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
