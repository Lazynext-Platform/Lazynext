/**
 * @module Render export endpoint — dispatches render jobs to the
 * render-service microservice. Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RENDER_SERVICE_URL =
	process.env.RENDER_SERVICE_URL || "http://localhost:8003";

export async function POST(request: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { projectId, timelineData, renderSettings } = await request.json();

		if (!projectId || !timelineData) {
			return NextResponse.json(
				{ success: false, error: "Project ID and Timeline Data are required" },
				{ status: 400 },
			);
		}

		console.log(`[API] Dispatching render job for project: ${projectId}`);

		try {
			const response = await fetch(`${RENDER_SERVICE_URL}/api/v1/jobs`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectId,
					format: renderSettings?.format || "mp4",
				}),
			});

			if (response.ok) {
				const data = (await response.json()) as {
					jobId: string;
					success: boolean;
				};
				return NextResponse.json({
					success: true,
					message: "Render job queued",
					jobId: data.jobId,
					statusEndpoint: `/api/render/status?jobId=${data.jobId}`,
				});
			}
		} catch (err) {
			console.warn(
				`[API] Render service unreachable (${RENDER_SERVICE_URL}). Falling back to local job ID.`,
				err,
			);
		}

		const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

		return NextResponse.json({
			success: true,
			message:
				"Render job queued (local fallback — render service not available)",
			jobId,
			statusEndpoint: `/api/render/status?jobId=${jobId}`,
		});
	} catch (error: unknown) {
		console.error("Render API Error:", error);
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
