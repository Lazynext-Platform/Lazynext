/**
 * @module Frame-streaming export job endpoint. Creates an awaiting-frames
 * job on the render-service and returns the endpoint URLs the browser uses
 * to stream RGBA frames (WYSIWYG compositor rendered). Falls back to
 * local WebCodecs encoding when the service is offline.
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { getProject } from "@/actions/project";
import { exportSchema } from "@/lib/validation";

const RENDER_SERVICE_URL =
	process.env.RENDER_SERVICE_URL || "http://localhost:8003";

/**
 * Creates an export job on the render-service in `awaiting_frames` state.
 * The browser then streams compositor-rendered RGBA frames to
 * `/api/v1/export/:jobId/frames` (see EditorClient.startExport).
 *
 * This route does NOT send timeline data for render-service to reconstruct —
 * rendering happens in the browser via the same WASM GPU compositor used for
 * preview (WYSIWYG). render-service only encodes the frames it receives.
 */
export async function POST(request: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const rawBody = await request.json();
		const parsed = exportSchema.safeParse(rawBody);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message || "Invalid input" },
				{ status: 400 },
			);
		}
		const { projectId, format, bitrate_kbps } = parsed.data;

		// 1. Fetch project data to derive export dimensions / duration
		const project = await getProject(projectId);
		if (!project) {
			return NextResponse.json(
				{ error: "Project not found" },
				{ status: 404 },
			);
		}

		const tracks = project.tracks || project.timeline?.tracks || [];
		const width = project.timeline?.width || 1920;
		const height = project.timeline?.height || 1080;
		const framerate = project.timeline?.framerate || 60;

		// Derive total frame count from the longest track
		const maxClipEnd = tracks.reduce(
			(
				max: number,
				track: {
					clips?: Array<{
						start_frame?: number;
						duration_frames?: number;
					}>;
				},
			) => {
				for (const clip of track.clips || []) {
					const end =
						(clip.start_frame || 0) + (clip.duration_frames || 0);
					if (end > max) max = end;
				}
				return max;
			},
			0,
		);
		const totalFrames = maxClipEnd || framerate * 5; // fallback 5s

		// 2. Create an awaiting-frames job on the render-service
		try {
			const response = await fetch(
				`${RENDER_SERVICE_URL}/api/v1/export`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						projectId,
						format,
						bitrate_kbps,
						width,
						height,
						framerate,
						totalFrames,
					}),
				},
			);

			if (response.ok) {
				const data = (await response.json()) as { jobId: string };
				return NextResponse.json({
					success: true,
					jobId: data.jobId,
					width,
					height,
					framerate,
					totalFrames,
					// Browser streams RGBA frames here:
					frameEndpoint: `${RENDER_SERVICE_URL}/api/v1/export/${data.jobId}/frames`,
					endEndpoint: `${RENDER_SERVICE_URL}/api/v1/export/${data.jobId}/frames/end`,
					statusEndpoint: `/api/render/status?jobId=${data.jobId}`,
				});
			}
		} catch (err) {
			console.warn(
				`[Export] Render service unreachable: ${err}. Browser will use WebCodecs fallback.`,
			);
		}

		// Render-service offline → browser falls back to local WebCodecs encode
		return NextResponse.json({
			success: true,
			jobId: null,
			width,
			height,
			framerate,
			totalFrames,
			fallback: "webcodecs",
			message:
				"Render service offline — browser will encode locally via WebCodecs.",
		});
	} catch (err: unknown) {
		console.error("Export API Error:", err);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
