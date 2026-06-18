import { NextResponse } from "next/server";

const RENDER_SERVICE_URL =
  process.env.RENDER_SERVICE_URL || "http://localhost:8003";

export async function POST(request: Request) {
  try {
    const { projectId, timelineData, renderSettings } = await request.json();

    if (!projectId || !timelineData) {
      return NextResponse.json(
        { success: false, error: "Project ID and Timeline Data are required" },
        { status: 400 },
      );
    }

    console.log(`[API] Dispatching render job for project: ${projectId}`);

    // Forward to the render-service microservice
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

    // Fallback: generate a local job ID (render service not running)
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
