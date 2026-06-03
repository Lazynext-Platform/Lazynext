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
    // We assume duration is calculated by looking at clips, or defaults to 120 frames
    const projectConfig = {
      width: project.timeline.width,
      height: project.timeline.height,
      fps: project.timeline.framerate,
      duration_frames: 120, // hardcoded for testing
      bg_color: [0.09, 0.09, 0.11, 1.0], // zinc-900 background
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
      exec(
        `cargo run --bin cli -- export ${projectJsonPath} ${outputMp4Path}`,
        { cwd: workspaceRoot },
        (error, stdout, stderr) => {
          if (error) {
            console.error("FFmpeg/Rust Export Error:", stderr);
            resolve(NextResponse.json({ error: "Render failed", details: stderr }, { status: 500 }));
            return;
          }

          console.log("Export Success:", stdout);
          
          // In a real app, we would upload outputMp4Path to an S3 bucket here
          // and return the public URL.
          
          resolve(NextResponse.json({ 
            success: true, 
            message: "Video rendered successfully!",
            file: outputMp4Path 
          }));
        }
      );
    });

  } catch (err: any) {
    console.error("Export API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
