import { NextResponse } from "next/server";

const RUST_API_GATEWAY_URL =
  process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

/**
 * Proxy AI generation requests to the Rust API Gateway.
 * The gateway handles LLM orchestration for AI-powered video/audio generation.
 *
 * POST /api/ai/generate { prompt, type }
 * → Rust Gateway POST /api/v1/ai/generate
 */
export async function POST(request: Request) {
  let body = { prompt: "", type: "video" };
  try {
    body = await request.json();

    if (!body.prompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 },
      );
    }

    const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({
        error: `Gateway returned ${res.status}`,
      }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.warn("[ai/generate] Rust gateway unreachable:", err);
    return NextResponse.json(
      {
        error:
          "AI generation unavailable — start the API Gateway on port 8005",
        type: body?.type || "video",
      },
      { status: 503 },
    );
  }
}
