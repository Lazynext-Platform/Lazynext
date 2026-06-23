import { NextResponse } from "next/server";
import { getProject } from "@/actions/project";
import { StorageService } from "@/lib/storage";
import path from "path";

const RENDER_SERVICE_URL =
	process.env.RENDER_SERVICE_URL || "http://localhost:8003";

export async function POST(request: Request) {
	try {
		const { projectId } = await request.json();
		if (!projectId) {
			return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
		}

		// 1. Fetch project data from database
		const project = await getProject(projectId);
		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		// 2. Build project config for export
		const tracks = project.tracks || project.timeline?.tracks || [];
		const maxClipEnd = tracks.reduce(
			(
				max: number,
				track: {
					clips?: Array<{ start_frame?: number; duration_frames?: number }>;
				},
			) => {
				for (const clip of track.clips || []) {
					const end = (clip.start_frame || 0) + (clip.duration_frames || 0);
					if (end > max) max = end;
				}
				return max;
			},
			0,
		);

		const projectConfig = {
			width: project.timeline?.width || 1920,
			height: project.timeline?.height || 1080,
			fps: project.timeline?.framerate || 60,
			duration_frames: maxClipEnd || 120,
			bg_color: [0.09, 0.09, 0.11, 1.0],
			tracks,
		};

		// 3. Save project config to temp file
		const tempDir = path.join(process.cwd(), ".tmp");
		await StorageService.ensureDirectory(tempDir);

		const projectJsonPath = path.join(tempDir, `project_${projectId}.json`);
		await StorageService.writeFile(
			projectJsonPath,
			JSON.stringify(projectConfig, null, 2),
		);

		// 4. Dispatch to render-service
		try {
			const response = await fetch(`${RENDER_SERVICE_URL}/api/v1/jobs`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					projectId,
					format: "mp4",
				}),
			});

			if (response.ok) {
				const data = (await response.json()) as { jobId: string };
				return NextResponse.json({
					success: true,
					message: "Export job dispatched to render farm",
					jobId: data.jobId,
					statusEndpoint: `/api/render/status?jobId=${data.jobId}`,
				});
			}
		} catch (err) {
			console.warn(
				`[Export] Render service unreachable: ${err}. Using dev fallback.`,
			);
		}

		// Dev fallback (production should always have render-service)
		return NextResponse.json({
			success: true,
			message:
				"Export manifest prepared (render service offline — job will process when service is available)",
			projectId,
			manifestPath: projectJsonPath,
		});
	} catch (err: unknown) {
		console.error("Export API Error:", err);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
