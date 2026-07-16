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

const MAX_JOB_AGE_MS = 30 * 60 * 1000; // 30 minute TTL
const MAX_JOB_ENTRIES = 1000;
let lastEviction = Date.now();

function evictStaleJobs() {
	const now = Date.now();
	if (now - lastEviction < 60_000) return; // evict at most once per minute
	lastEviction = now;
	for (const [jobId, job] of localJobs) {
		if (now - job.createdAt > MAX_JOB_AGE_MS) {
			localJobs.delete(jobId);
		}
	}
	if (localJobs.size > MAX_JOB_ENTRIES) {
		const entries = [...localJobs.entries()].sort(
			(a, b) => a[1].createdAt - b[1].createdAt,
		);
		for (const [jobId] of entries.slice(0, entries.length - MAX_JOB_ENTRIES)) {
			localJobs.delete(jobId);
		}
	}
}

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

		// Constrain jobId to a safe id shape to prevent request-forgery/SSRF via
		// path injection into the render-service URL.
		if (!/^[A-Za-z0-9_-]{1,128}$/.test(jobId)) {
			return NextResponse.json(
				{ success: false, error: "Invalid Job ID" },
				{ status: 400 },
			);
		}

		try {
			const response = await fetch(
				`${RENDER_SERVICE_URL}/api/v1/jobs/${encodeURIComponent(jobId)}`,
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
			evictStaleJobs();
		}

		return NextResponse.json({
			success: true,
			jobId,
			progress: 0,
			status: "offline",
			message:
				"Render service is offline. Start render-service on port 8003 to process exports.",
		});
	} catch (error: unknown) {
		console.error("Render Status API Error:", error);
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
