import { NextResponse } from "next/server";
import { getProject } from "@/actions/project";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";

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

		// 2. Transform DB project into the JSON structure expected by Rust CLI
		const tracks = project.tracks || project.timeline?.tracks || [];
		const maxClipEnd = tracks.reduce((max: number, track: any) => {
			for (const clip of track.clips || []) {
				const end = (clip.start_frame || 0) + (clip.duration_frames || 0);
				if (end > max) max = end;
			}
			return max;
		}, 0);

		const projectConfig = {
			width: project.timeline?.width || 1920,
			height: project.timeline?.height || 1080,
			fps: project.timeline?.framerate || 60,
			duration_frames: maxClipEnd || 120,
			bg_color: [0.09, 0.09, 0.11, 1.0], // zinc-900 background
			tracks,
		};

		// 3. Write temp project.json
		const tempDir = path.join(process.cwd(), ".tmp");
		await fs.mkdir(tempDir, { recursive: true });

		const projectJsonPath = path.join(tempDir, `project_${projectId}.json`);
		const outputMp4Path = path.join(tempDir, `output_${projectId}.mp4`);

		await fs.writeFile(projectJsonPath, JSON.stringify(projectConfig, null, 2));

		// 4. Invoke the Rust CLI via Cargo
		// Note: In production, the CLI would be a built binary. For dev, we use cargo.
		const workspaceRoot = path.join(process.cwd(), "../..");

		return new Promise<NextResponse>((resolve) => {
			// Mocking export success to avoid cargo run inside web container
			setTimeout(() => {
				console.log("Mock Export Success");
				resolve(
					NextResponse.json({
						success: true,
						message: "Video rendered successfully! (Mocked)",
						file: outputMp4Path,
					}),
				);
			}, 1500);
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		console.error("Export API Error:", err);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
