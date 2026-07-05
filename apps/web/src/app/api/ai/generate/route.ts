/** @module API route for proxying AI generation requests to the Rust API Gateway */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { aiGenerateSchema } from "@/lib/validation";

const RUST_API_GATEWAY_URL =
  process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

/**
 * Proxy AI generation requests to the Rust API Gateway.
 * The gateway handles LLM orchestration for AI-powered video/audio generation.
 * Requires authentication.
 *
 * POST /api/ai/generate { prompt, type }
 * → Rust Gateway POST /api/v1/ai/generate
 */
export async function POST(request: Request) {
  let body: { prompt: string; type: string } = { prompt: "", type: "video" };
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = aiGenerateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    body = parsed.data;

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
