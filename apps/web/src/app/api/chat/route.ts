/**
 * @module AI chat endpoint — forwards natural-language edit prompts to the
 * Rust API Gateway's autonomous_edit endpoint and returns the result.
 */

import { NextResponse } from "next/server";

/**
 * POST /api/chat
 * Accepts a JSON body with a `prompt` field and proxies it to the Rust
 * API Gateway for autonomous timeline editing.
 */
export async function POST(req: Request) {
	try {
		const { prompt } = await req.json();

		if (!prompt || typeof prompt !== "string") {
			return NextResponse.json(
				{ error: "Prompt is required" },
				{ status: 400 },
			);
		}

		// Proxy the intent to the centralized Rust API Gateway
		const rustGatewayUrl = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";
		
		const response = await fetch(`${rustGatewayUrl}/api/v1/autonomous_edit`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				// Pass along any auth tokens here if needed
			},
			body: JSON.stringify({
				prompt,
				require_plan_approval: false,
				source_files: [],
			}),
		});

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`Rust Gateway error ${response.status}: ${errText}`);
		}

		const data = await response.json();

		if (!data.success) {
			throw new Error(data.error || "Unknown error from Rust Gateway");
		}

		return NextResponse.json({
			response: data.message || "Autonomously processed your edit via the Rust engine.",
			mode: "rust-gateway",
		});
	} catch (error: unknown) {
		console.error("Agent proxy error:", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
