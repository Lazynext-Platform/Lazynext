/**
 * @module Projects API — fetches the authenticated user's project list from
 * the Rust API Gateway with session-based authorization.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { createProjectSchema } from "@/lib/validation";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

function getInternalApiKey(): string {
	if (INTERNAL_API_KEY) return INTERNAL_API_KEY;
	if (process.env.NODE_ENV === "production") {
		throw new Error("INTERNAL_API_KEY must be set in production");
	}
	return "lazynext-internal-dev-key";
}

/**
 * GET /api/projects
 * Returns the list of projects owned by the authenticated user, proxied
 * through the Rust API Gateway.
 */
export async function GET() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/projects`, {
			headers: {
				"X-Internal-API-Key": getInternalApiKey()
			}
		});

		if (!res.ok) {
			throw new Error("Failed to fetch projects from Rust Gateway");
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

/**
 * POST /api/projects
 * Creates a new project for the authenticated user via the Rust API Gateway.
 */
export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const rawBody = await req.json();
		const parsed = createProjectSchema.safeParse(rawBody);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message || "Invalid project name" },
				{ status: 400 },
			);
		}

		const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/projects`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Internal-API-Key": getInternalApiKey(),
			},
			body: JSON.stringify(parsed.data),
		});

		if (!res.ok) {
			const errText = await res.text().catch(() => "Unknown error");
			throw new Error(`Rust Gateway error ${res.status}: ${errText}`);
		}

		const data = await res.json();
		return NextResponse.json(data, { status: 201 });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
